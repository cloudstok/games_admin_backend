const client = require("amqplib");
const axios = require('axios');
const { write } = require("../db_config/db");
const { generateUUIDv7 } = require("./common_function");
const { encryption } = require("./ecryption-decryption");

let pubChannel, subChannel = null;
let connected = false;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1000;
const QUEUES = {
    cashout: 'cashout_queue',
    rollback: 'rollback_queue',
    failed: 'failed_queue'
};
const { AMQP_CONNECTION_STRING } = process.env;


async function connect() {
    if (connected && pubChannel && subChannel) return;
    try {
        console.info("⌛️ Connecting to Rabbit-MQ Server", AMQP_CONNECTION_STRING.split('@')[1]);
        const connection = await client.connect(AMQP_CONNECTION_STRING);
        console.info("✅ Rabbit MQ Connection is ready");
        [pubChannel, subChannel] = await Promise.all([
            connection.createChannel(),
            connection.createChannel()
        ]);
        console.info("🛸 Created RabbitMQ Channel successfully");
        connected = true;
    } catch (error) {
        console.error(error);
        console.error("Not connected to MQ Server");
    }
}

async function sendToQueue(exchange, queueName, message, delay = 0, retries = 0) {
    try {
        if (!pubChannel) {
            await connect();
        }
        pubChannel.publish(exchange, queueName, Buffer.from(message), {
            headers: { "x-delay": delay, "x-retries": retries }, persistent: true
        });
        console.log(`Message sent to ${queueName} queue on exchange ${exchange}`);
    } catch (error) {
        console.error(`Failed to send message to ${queueName} queue on exchange ${exchange}: ${error.message}`);
        throw error;
    }
}

async function consumeQueue(queue, handler) {
    try {
        if (!subChannel) await connect();
        await subChannel.assertQueue(queue, { durable: true });
        console.debug(`Creating consumer for ${queue}`);

        await subChannel.consume(queue, async (msg) => {
            if (!msg) return console.error("Invalid incoming message");

            try {
                await handler(queue, msg);
            } catch (error) {
                console.error(`Handler error for ${queue}: ${error.message}`);
                subChannel.nack(msg);
            }
        }, { noAck: false });
    } catch (error) {
        console.error(`Queue processing error: ${error.message}`);
        throw error;
    }
}

async function handleMessage(queue, msg) {
    const message = JSON.parse(msg.content.toString());
    let retries = msg.properties.headers['x-retries'] || 0;
    let dbData = message.db_data;
    delete message.db_data;

    if (queue === QUEUES.failed) {
        await sendNotificationToGame(queue, dbData);
        console.error(`Message permanently failed in ${queue}: ${JSON.stringify(message)}`);
        subChannel.ack(msg); // Acknowledge the message in the failed queue
        return;
    }

    try {
        const response = await axios(message);
        if (response?.status === 200) {
            console.log(`Request succeeded for ${queue}:`, response.data);
            if (queue === QUEUES.rollback) await sendNotificationToGame(queue, dbData);
            await executeSuccessQueries(queue, dbData);
            subChannel.ack(msg);
        } else {
            console.error(`Request failed for ${queue}: ${response.status}`);
            await handleFailure(queue, dbData, message, retries);
            await handleRetryOrMoveToNextQueue(queue, message, msg, retries, dbData);
        }
    } catch (error) {
        console.error(`Request failed for ${queue}: ${error.message}`);
        await handleFailure(queue, dbData, message, retries);
        await handleRetryOrMoveToNextQueue(queue, message, msg, retries, dbData);
    }
}

async function sendNotificationToGame(queue, data) {
    let { operatorId, userId, amount, txn_ref_id } = data;
    const [getPendingTransaction] = await write.query(`SELECT * FROM transaction as tr inner join pending_transactions as pt on pt.transaction_id = tr.id inner join games_master_list as gm on gm.game_id = pt.game_id WHERE tr.txn_ref_id = ? and tr.txn_type = '1' and tr.txn_status = '1'`, [txn_ref_id]);
    const [getDebitTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ? and type_type = '0'`, [txn_ref_id]);
    let postData = {
        userId, operatorId
    }
    postData.amount = queue === QUEUES.failed ? null : amount;
    if (queue === QUEUES.failed) {
        postData.description = `Due to some technical issues, Your credit is in process for ROUND ${getDebitTransaction[0].description.split(' ')[7]}`;
    } else {
        postData.rollbackMsg = getDebitTransaction[0].description;
    }
    const options = {
        method: 'POST',
        url: getPendingTransaction[0].backend_base_url + '/settleBet',
        headers: {
            'Content-Type': 'application/json',
        },
        data: postData
    };
    try {
        const data = await axios(options);
        if (data.status === 200) {
            console.log(`[SUCCESS] Response from game for ${queue} event is:::`, JSON.stringify(data.data));
        } else {
            console.log(`[Error] Response from game for ${queue} event is:::`, JSON.stringify(data.data));
        }
    } catch (err) {
        console.error(`[Error] Response from game for ${queue} event is:::`, JSON.stringify(err?.response?.data));
    }
}


async function executeSuccessQueries(queue, responseData) {
    const { userId, token, operatorId, txn_id, amount, txn_ref_id, description, txn_type } = responseData;
    await write.query("INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[userId, token, operatorId, txn_id, amount, txn_ref_id, description, `${txn_type}`, '2']]);
    console.log(`Successful ${queue} transaction logged to db`);
    if (queue === QUEUES.rollback) {
        const updateTransaction = write.query(`UPDATE transaction SET txn_status = "0" WHERE txn_ref_id = ? and txn_type = '1'`, [txn_ref_id]);
        const updatePendingTransaction = write.query(`UPDATE pending_transaction SET event = 'rollback', txn_status = '0' WHERE transaction_id = (SELECT id from transaction where WHERE txn_ref_id = ? and txn_type = '1')`, [txn_ref_id]);
        await Promise.all([updateTransaction, updatePendingTransaction]);
    }
}



async function handleFailure(queue, data, message, retries) {
    if (queue === QUEUES.cashout && retries === 10) {
        await executeCashoutFailureQueries(data, message);
    }
}

async function executeCashoutFailureQueries(data, message) {
    const { userId, token, operatorId, txn_id, amount, txn_ref_id, description, txn_type } = data;
    const [{ insertId }] = await write.query("INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[userId, token, operatorId, txn_id, amount, txn_ref_id, description, `${txn_type}`, '1']]);
    await write.query("INSERT IGNORE INTO pending_transactions (transaction_id, game_id, options) VALUES (?)", [[insertId, 2, JSON.stringify(message)]]);
    console.log('As Cashout queue is failed, inserting pending transaction for further future manual rollback or cashout retry');
}


async function handleRetryOrMoveToNextQueue(currentQueue, message, originalMsg, retries, dbData) {

    if (currentQueue === QUEUES.rollback && retries === 0) {
        const txn_id = await generateUUIDv7();
        const [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [dbData.txn_ref_id]);
        let rollbackData = {
            txn_id, amount: getRollbackTransaction[0].amount, txn_ref_id: dbData.txn_ref_id, description: `${getRollbackTransaction[0].amount} Rollback-ed for transaction with reference ID ${dbData.txn_ref_id}`, txn_type: 2
        }
        const [operator] = await write.query(`SELECT * FROM operator where user_id = ?`, [dbData.operatorId]);
        message.data.data = await encryption(rollbackData, operator[0].secret);
        for (const key in rollbackData) {
            if (rollbackData.hasOwnProperty(key)) {
                dbData[key] = rollbackData[key];
            }
        }
    }

    message.db_data = dbData;
    retries += 1


    if (retries <= MAX_RETRIES) {
        console.log(`Retrying message in ${currentQueue} (retry #${retries})`);
        setTimeout(async () => {
            try {
                await sendToQueue('', currentQueue, JSON.stringify(message), RETRY_DELAY_MS, retries);
                subChannel.ack(originalMsg); 
            } catch (error) {
                console.error(`Failed to retry message in ${currentQueue}: ${error.message}`);
                subChannel.nack(originalMsg); 
            }
        }, RETRY_DELAY_MS);
    } else {
        const nextQueue = currentQueue === QUEUES.cashout ? QUEUES.rollback : QUEUES.failed;
        console.log(`Moving message from ${currentQueue} to ${nextQueue}`);
        retries = 0;
        try {
            await sendToQueue('', nextQueue, JSON.stringify(message), 0, retries);
            subChannel.ack(originalMsg); 
        } catch (error) {
            console.error(`Failed to move message from ${currentQueue} to ${nextQueue}: ${error.message}`);
            subChannel.nack(originalMsg);
        }
    }
}

module.exports = {
    sendToQueue,
    consumeQueue,
    handleMessage,
    connect
};