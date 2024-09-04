const express = require('express');
const cors = require('cors');
const { operatorRouter } = require('./routes/operator-route');
const { serviceRouter } = require('./routes/service-route');
// const { deleteRedis } = require('./redis/connection');
const { consumeQueue, connect, handleMessage } = require('./utilities/amqp');
const createLogger = require('./utilities/logger');
const { loadConfig } = require('./utilities/load-config');
const logger = createLogger('Server');
const app = express();

require('dotenv').config();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());
app.use('/operator', operatorRouter);
app.use('/service', serviceRouter);
// (async ()=> deleteRedis('users'))();
app.listen(PORT, () => {
    logger.info(`Server listening at PORT ${PORT}`);
    initializeQueues();
});
(async()=> await loadConfig())();

async function initializeQueues() {
    try {
        await connect(); // Establishing AMQP Connection

        const Queues = {
            debit: 'debit_queue',
            cashout: 'cashout_queue',
            rollback: 'rollback_queue',
            failed: 'failed_queue',
            errored: 'errored_queue'
        };
        consumeQueue(Queues.debit, handleMessage);
        consumeQueue(Queues.cashout, handleMessage);
        consumeQueue(Queues.rollback, handleMessage);
        consumeQueue(Queues.failed, handleMessage);
        consumeQueue(Queues.errored, handleMessage);

        logger.info('RabbitMQ queues are being consumed');
    } catch (error) {
        logger.error('Failed to initialize queues:', error);
    }
}
