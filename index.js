require('dotenv').config();
const tracer = require('dd-trace').init();
const express = require('express');
const cors = require('cors');
const { operatorRouter } = require('./routes/operator-route');
const { serviceRouter } = require('./routes/service-route');
const { connect } = require('./utilities/amqp');
const createLogger = require('./utilities/logger');
const { loadConfig, initCacheRefresh } = require('./utilities/load-config');
const { checkDatabaseConnection } = require('./utilities/db-connection');
const logger = createLogger('Server');
const app = express();
const cron = require('node-cron');
const { storeHourlyStats, restartQueues } = require('./utilities/common_function');
const PORT = process.env.PORT || 4100;
process.tracer  = tracer;

app.use(cors());
app.use(express.json());

const initializeServer = async () => {
    try {
        // Loading All App Dependencies
        await Promise.all([checkDatabaseConnection(), connect()]);
        await loadConfig({ loadAll: true});
        cron.schedule('0 * * * *', async () => {
            console.log('Running storeHourlyStats function at the start of every hour');
            try {
                await storeHourlyStats();
                restartQueues();
            } catch (error) {
                console.error('Error executing storeHourlyStats:', error);
            }
        });
        initCacheRefresh();
        app.use('/operator', operatorRouter);
        app.use('/service', serviceRouter);
        app.listen(PORT, () => {
            logger.info(`Server listening at PORT ${PORT}`);
        });
    } catch (error) {
        logger.error('Error during server initialization:', error);
        process.exit(1);
    }
};

initializeServer();
