const client = require("amqplib");

let connection = null;
let pubChannel = null;
let subChannel = null;
let exchange = `games/admin`;
let queue = `game/admin`;
let connected = false;


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

async function sendToQueue(message, delay = 0) {
    try {
        if (!pubChannel) {
            await connect();
        }
        return pubChannel.publish(exchange, queue, Buffer.from(message), {
            headers: { "x-delay": delay }
        });
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function consume(handler) {
    try {
        if (!subChannel) await connect();
        await subChannel.assertQueue(queue, { durable: true });
        console.debug(`creating consumer ${queue}`);
        return await subChannel.consume(queue, async (msg) => {
            try {
                if (!msg) {
                    return console.error("Invalid incoming message");
                }
                await handler(msg.content.toString());
                subChannel.ack(msg);
            } catch (error) {
                console.error(error);
                subChannel.nack(msg);
            }
        }, { noAck: false });
    } catch (error) {
        console.error(error);
        throw error;
    }
}


// async function handleMessage(message) {
//     console.log("Received message:", message);
//     // Process the message here
//   }

// sendToQueue("Games admin testing").then(() => {
//     console.log("Message sent to RabbitMQ");
// }).catch((error) => {
//     console.error("Error sending message:", error);
// });

// consume(handleMessage).then((consumerTag) => {
//     console.log(`Consuming messages from queue '${queue}'. Consumer tag: ${JSON.stringify(consumerTag)}`);
// }).catch((error) => {
//     console.error("Error consuming messages:", error);
// });


module.exports = {
    sendToQueue,
    consume
};
