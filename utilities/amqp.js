const client = require("amqplib");
const axios = require('axios');
const { write } = require("./db-connection");
const { generateUUIDv7 } = require("./common_function");
const { encryption } = require("./ecryption-decryption");
const createLogger = require('../utilities/logger');
const { variableConfig } = require("./load-config");
const thirdPartyLogger = createLogger('Third_Party_Data', 'jsonl');
const failedThirdPartyLogger = createLogger('Failed_Third_Party_Data', 'jsonl');
const gameNotificationLogger = createLogger('Game_Notification', 'jsonl');
const failedGameNotificationLogger = createLogger('Failed_Game_Notification', 'jsonl');
const rabbitMQLogger = createLogger('Queue');
const logger = createLogger('Consumer');

let pubChannel, subChannel = null;
let connected = false;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1000;
const QUEUES = {
    debit: 'debit_queue',
    cashout: 'cashout_queue',
    rollback: 'rollback_queue',
    failed: 'failed_queue',
    errored: 'errored_queue'
};
const { AMQP_CONNECTION_STRING } = process.env;

async function initQueue() {
    await connect();
    const Queues = {
        debit: 'debit_queue',
        cashout: 'cashout_queue',
        rollback: 'rollback_queue',
        failed: 'failed_queue',
        errored: 'errored_queue'
    };
    
    for (const [key, queue] of Object.entries(Queues)) {
        await consumeQueue(queue, handleMessage);
    }
    logger.info('RabbitMQ queues are being consumed');
}

async function connect() {
    if (connected && pubChannel && subChannel) return;
    try {
        rabbitMQLogger.info("⌛️ Connecting to Rabbit-MQ Server", AMQP_CONNECTION_STRING.split('@')[1]);
        const connection = await client.connect(AMQP_CONNECTION_STRING);
        rabbitMQLogger.info("✅ Rabbit MQ Connection is ready");
        [pubChannel, subChannel] = await Promise.all([
            connection.createChannel(),
            connection.createChannel()
        ]);
        pubChannel.removeAllListeners('close');
        pubChannel.removeAllListeners('error');
        subChannel.removeAllListeners('close');
        subChannel.removeAllListeners('error');
        pubChannel.on('close',async ()=>{ console.error("pubChannel Closed") ;  pubChannel = null; connected= false; });
        subChannel.on('close',async ()=>{ console.error("subChannel Closed") ;  subChannel = null; connected= false; /*initQueue*/ });
        pubChannel.on('error',async (msg)=>{ console.error("pubChannel Error" , msg); });
        subChannel.on('error',async (msg)=>{ console.error("subChannel Error" , msg); initQueue() });
        rabbitMQLogger.info("🛸 Created RabbitMQ Channel successfully");
        connected = true;
    } catch (error) {
        rabbitMQLogger.error(error);
        rabbitMQLogger.error("Not connected to MQ Server");
    }
}

async function sendToQueue(exchange, queueName, message, delay = 0, retries = 0) {
    try {
        if (!pubChannel) {
            await connect();
        }
        await pubChannel.assertQueue(queueName, { durable: true });
        pubChannel.publish(exchange, queueName, Buffer.from(message), {
            headers: { "x-delay": delay, "x-retries": retries }, persistent: true
        });
        rabbitMQLogger.info(`Message sent to ${queueName} queue on exchange ${exchange}`);
    } catch (error) {
        rabbitMQLogger.error(`Failed to send message to ${queueName} queue on exchange ${exchange}: ${error.message}`);
        throw error;
    }
}

async function consumeQueue(queue, handler) {
    try {
        if (!subChannel) await connect();
        await subChannel.assertQueue(queue, { durable: true });
        rabbitMQLogger.info(`Creating consumer for ${queue}`);
        await subChannel.consume(queue, async (msg) => {
            if (!msg) throw ({message:"Invalid incoming message for queue "});
            try {
                await handler(queue, msg);
            } catch (error) {
                rabbitMQLogger.error(`Handler error for ${queue}: ${error.message}`);
                subChannel.nack(msg);
            }
        }, { noAck: false });
    } catch (error) {
        rabbitMQLogger.error(`Queue processing error: ${error.message}`);
        throw error;
    }
}

async function handleMessage(queue, msg) {
    let logId = await generateUUIDv7()
    const message = JSON.parse(msg.content.toString());
    let logDataReq = {logId, message};
    let retries = msg.properties.headers['x-retries'] || 0;
    let dbData = message.db_data;
    delete message.db_data;

    if (queue === QUEUES.failed) {
        await sendNotificationToGame(queue, dbData);
        console.error(`Message permanently failed in ${queue}: ${JSON.stringify(message)}`);
        subChannel.ack(msg);
        return;
    }

    if (queue === QUEUES.errored) {
        console.error(`Message encountered an error in ${queue}: ${JSON.stringify(message)}`);
        subChannel.ack(msg);
        return;
    }

    try {
        const response = await axios(message);
        if (response?.status === 200) {
            thirdPartyLogger.info(JSON.stringify({ req: logDataReq, res: response?.data}));
            console.log(`Request succeeded for ${queue}:`, response.data);
            if (queue === QUEUES.rollback) await sendNotificationToGame(queue, dbData);
            await executeSuccessQueries(queue, dbData);
            subChannel.ack(msg);
        } else {
            console.error(`Request failed for ${queue}: ${response.status}`);
            failedThirdPartyLogger.error(JSON.stringify({ req: logDataReq, res: response?.data}));
            const insertId = await handleFailure(queue, dbData, message, retries);
            if (insertId) {
                dbData.transaction_id = insertId
            }
            await handleRetryOrMoveToNextQueue(queue, message, msg, retries, dbData);
        }
    } catch (error) {
        let response = error.response ? error.response.data : error;
        failedThirdPartyLogger.error(JSON.stringify({ req: logDataReq, res: response}));
        console.error(`Request failed for ${queue}: ${error.message}`);
        const insertId = await handleFailure(queue, dbData, message, retries);
        if (insertId) {
            dbData.transaction_id = insertId
        }
        await handleRetryOrMoveToNextQueue(queue, message, msg, retries, dbData);
    }
}

async function sendNotificationToGame(queue, data) {
    let logId = await generateUUIDv7();
    let { operatorId, userId, amount, game_id, debit_description, socket_id, bet_id, txn_type, token } = data;
    let backend_base_url = (variableConfig.games_masters_list.find(e=> e.game_id == game_id))?.backend_base_url || null;
    if(!backend_base_url){
        console.log(`[Error] Unable to get the Backend Base URL for the given game id`);
        return;
    }
    let postData = {
        userId, operatorId, txn_type, bet_id, socket_id, token
    }
    postData.amount = queue === QUEUES.failed ? null : amount;
    if (queue === QUEUES.failed) {
        postData.description = `Due to some technical issues, Your credit is in process for ROUND ${debit_description.split(' ')[7]}`;
    } else {
        postData.rollbackMsg = debit_description;
    }
    const options = {
        method: 'POST',
        url: backend_base_url + '/settleBet',
        headers: {
            'Content-Type': 'application/json',
        },
        data: postData
    };
    let logDataReq = {logId, options};
    try {
        const data = await axios(options);
        if (data.status === 200) {
            gameNotificationLogger.info(JSON.stringify({ req: logDataReq, res: data?.data}));
            console.log(`[SUCCESS] Response from game for ${queue} event is:::`, JSON.stringify(data.data));
        } else {
            failedGameNotificationLogger.error(JSON.stringify({ req: logDataReq, res: data?.data}));
            console.log(`[Error] Response from game for ${queue} event is:::`, JSON.stringify(data.data));
        }
    } catch (error) {
        let response = error.response ? error.response.data : error;
        failedGameNotificationLogger.error(JSON.stringify({ req: logDataReq, res: response}));
        console.error(`[Error] Response from game for ${queue} event is:::`, JSON.stringify(error?.response?.data));
    }
}


async function executeSuccessQueries(queue, responseData) {
    const { userId, token, operatorId, txn_id, amount, txn_ref_id, description, txn_type, game_id, transaction_id } = responseData;
    await write("INSERT IGNORE INTO transaction (user_id, game_id , session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[userId, game_id, token, operatorId, txn_id, amount, txn_ref_id, description, `${txn_type}`, '2']]);
    console.log(`Successful ${queue} transaction logged to db`);
    if (queue === QUEUES.rollback) {
        const updateTransaction = write(`UPDATE transaction SET txn_status = "0" WHERE txn_ref_id = ? and txn_type = '1'`, [txn_ref_id]);
        const updatePendingTransaction = write(`UPDATE pending_transaction SET event = 'rollback', txn_status = '0' WHERE transaction_id = ?`, [transaction_id]);
        await Promise.all([updateTransaction, updatePendingTransaction]);
    }
}



async function handleFailure(queue, data, message, retries) {
    let insertId = null;
    if ((queue === QUEUES.cashout && retries === 10) || (queue === QUEUES.debit)) {
        insertId = await executeCashoutFailureQueries(data, message);
    }
    return insertId;
}

async function executeCashoutFailureQueries(data, message) {
    const { userId, token, operatorId, txn_id, amount, txn_ref_id, description, txn_type, game_id } = data;
    if(data.txn_type === 0){
        console.log('As Cashout queue is failed and transaction type is DEBIT retry is not permittted, inserting failed debit transaction');
        await write("INSERT IGNORE INTO transaction (user_id,game_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[userId, game_id, token, operatorId, txn_id, amount, txn_ref_id, description, `${txn_type}`, '0']]);
    }else{
        const [{ insertId }] = await write("INSERT IGNORE INTO transaction (user_id,game_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[userId, game_id, token, operatorId, txn_id, amount, txn_ref_id, description, `${txn_type}`, '1']]);
        await write("INSERT IGNORE INTO pending_transactions (transaction_id, game_id, options) VALUES (?)", [[insertId, game_id, JSON.stringify(message)]]);
        console.log('As Cashout queue is failed, inserting pending transaction for further future manual rollback or cashout retry');
        return insertId;
    }
}


async function handleRetryOrMoveToNextQueue(currentQueue, message, originalMsg, retries, dbData) {

    if (currentQueue === QUEUES.rollback && retries === 0) {
        const txn_id = await generateUUIDv7();
        const [getRollbackTransaction] = await write(`SELECT * FROM transaction WHERE txn_id = ?`, [dbData.txn_ref_id]);
        if (!getRollbackTransaction || getRollbackTransaction.length === 0) {
            console.error(`Rollback transaction not found for txn_ref_id: ${dbData.txn_ref_id}`);
            await sendToQueue('', QUEUES.errored, JSON.stringify(message), 0, retries);
            subChannel.ack(originalMsg);
            return;
        }
        let rollbackData = {
            txn_id, amount: getRollbackTransaction[0].amount, txn_ref_id: dbData.txn_ref_id, description: `${getRollbackTransaction[0].amount} Rollback-ed for transaction with reference ID ${dbData.txn_ref_id}`, txn_type: 2
        }
        const operator = (variableConfig.operator_data.find(e=> e.user_id === dbData.operatorId)) || null;
        message.data.data = await encryption(rollbackData, operator.secret);
        dbData.debit_description = getRollbackTransaction[0].description
        for (const key in rollbackData) {
            if (rollbackData.hasOwnProperty(key)) {
                dbData[key] = rollbackData[key];
            }
        }
    }

    if (currentQueue === QUEUES.debit) {
        console.error(`As DEBIT event is failed in queue ${currentQueue}, initiated failed bet request to the game`);
        await sendNotificationToGame(currentQueue, dbData);
        subChannel.ack(originalMsg);
        return;
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
    initQueue,
    sendToQueue,
    connect
};