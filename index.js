const express = require('express');
const cors = require('cors');
const { operatorRouter } = require('./routes/operator-route');
const { serviceRouter } = require('./routes/service-route');
// const { deleteRedis } = require('./redis/connection');
const { consumeQueue, connect, handleMessage } = require('./utilities/amqp');
const createLogger = require('./utilities/logger');
const { loadConfig } = require('./utilities/load-config');
const { checkDatabaseConnection } = require('./utilities/db-connection');
const logger = createLogger('Server');
const app = express();

require('dotenv').config();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());

const initializeServer = async () => {
    try {
        await checkDatabaseConnection();
        await loadConfig();
        app.use('/operator', operatorRouter);
        app.use('/service', serviceRouter);

        app.listen(PORT, () => {
            logger.info(`Server listening at PORT ${PORT}`);
            initializeQueues(); 
        });
    } catch (error) {
        logger.error('Error during server initialization:', error);
    }
};

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
        
        for (const [key, queue] of Object.entries(Queues)) {
            consumeQueue(queue, handleMessage);
        }

        logger.info('RabbitMQ queues are being consumed');
    } catch (error) {
        logger.error('Failed to initialize queues:', error);
    }
}

initializeServer();
