const client = require("amqplib");
const axios = require('axios');

let connection = null;
let pubChannel = null;
let subChannel = null;
let exchange = `games/admin`;
let queue = `games/admin`;
let connected = false;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1000;
const QUEUES = {
    cashout: 'cashout_queue',
    rollback: 'rollback_queue',
    failed: 'failed_queue'
};


async function connect() {
    const amqpUrl = `amqp://admin:RxP09b77XsEz@games.adminsportal.com:5672`;
    if (connected && pubChannel && subChannel) return;
    try {
        console.info("⌛️ Connecting to Rabbit-MQ Server", amqpUrl);
        connection = await client.connect(amqpUrl);
        console.info("✅ Rabbit MQ Connection is ready");
        [pubChannel, subChannel] = await Promise.all([
            connection.createChannel(),
            connection.createChannel()
        ]);
        await pubChannel.assertExchange(exchange, "x-delayed-message", {
            autoDelete: false,
            durable: true,
            arguments: { "x-delayed-type": "direct" }
        });
        await pubChannel.assertQueue(queue, { durable: true });
        await pubChannel.bindQueue(queue, exchange, queue); // This is done for simplicity.
        console.info("🛸 Created RabbitMQ Channel successfully");
        connected = true;
    } catch (error) {
        console.error(error);
        console.error("Not connected to MQ Server");
    }
}

async function sendToQueue(exchange, queueName, message, delay = 0) {
    try {
        if (!pubChannel) {
            await connect();
        }
        pubChannel.publish(exchange, queueName, Buffer.from(message), {
            headers: { "x-delay": delay }
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
                await handler(queue, msg.content.toString());
                subChannel.ack(msg);
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

// async function handleMessage(queue, message) {
//     try {
//         const response = await sendRequest(message);
//         console.log(`Request succeeded for ${queue}:`, response);
//     } catch (error) {
//         console.error(`Request failed for ${queue}: ${error.message}`);

//         if (queue === QUEUES.cashout) {
//             await handleRetryOrMoveToNextQueue(queue, message, QUEUES.rollback);
//         } else if (queue === QUEUES.rollback) {
//             await handleRetryOrMoveToNextQueue(queue, message, QUEUES.failed);
//         } else {
//             console.error(`Message permanently failed in ${queue}: ${message}`);
//         }
//     }
// }

// async function handleRetryOrMoveToNextQueue(currentQueue, message, nextQueue) {
//     const retries = getRetriesFromMessage(message) + 1;

//     if (retries < MAX_RETRIES) {
//         console.log(`Retrying message in ${currentQueue} (retry #${retries})`);
//         setTimeout(async () => {
//             await sendToQueue('', currentQueue, appendRetriesToMessage(message, retries), RETRY_DELAY_MS);
//         }, RETRY_DELAY_MS);
//     } else {
//         console.log(`Moving message from ${currentQueue} to ${nextQueue}`);
//         await sendToQueue('', nextQueue, message);
//     }
// }

// async function sendRequest(message) {
//     const response = await axios.post('your_api_endpoint', message);
//     return response.data;
// }

// function getRetriesFromMessage(message) {
//     // Assuming message is a JSON string with a "retries" field
//     const parsedMessage = JSON.parse(message);
//     return parsedMessage.retries || 0;
// }

// function appendRetriesToMessage(message, retries) {
//     const parsedMessage = JSON.parse(message);
//     parsedMessage.retries = retries;
//     return JSON.stringify(parsedMessage);
// }



module.exports = { sendToQueue, consumeQueue };