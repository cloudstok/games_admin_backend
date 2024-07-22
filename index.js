const express = require('express');
const cors = require('cors');
const { operatorRouter } = require('./routes/operator-route');
const { serviceRouter } = require('./routes/service-route');
const { deleteRedis } = require('./redis/connection');
const { consumeQueue, connect, handleMessage } = require('./utilities/amqp');
const app = express();

require('dotenv').config();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());
app.use('/operator', operatorRouter);
app.use('/service', serviceRouter);

app.listen(PORT, () => {
    console.log(`Server listening at PORT ${PORT}`);
    initializeQueues();
});

async function initializeQueues() {
    try {
        await connect(); // Establishing AMQP Connection

        const Queues = {
            debit: 'debit_queue',
            cashout: 'cashout_queue',
            rollback: 'rollback_queue',
            failed: 'failed_queue'
        };
        consumeQueue(Queues.debit, handleMessage);
        consumeQueue(Queues.cashout, handleMessage);
        consumeQueue(Queues.rollback, handleMessage);
        consumeQueue(Queues.failed, handleMessage);

        console.log('RabbitMQ queues are being consumed');
    } catch (error) {
        console.error('Failed to initialize queues:', error);
    }
}
