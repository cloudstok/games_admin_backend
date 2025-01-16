require('dotenv').config();
const createLogger = require('./utilities/logger');
const logger = createLogger('Consumer');
const { initQueue, connect } = require('./utilities/amqp');
const { checkDatabaseConnection } = require('./utilities/db-connection');
const { loadConfig } = require('./utilities/load-config');
const tracer = require('dd-trace').init({
  service: 'games-admin-amqp-consumer',
});
process.tracer  = tracer;
async function initializeQueues() {
  try {
    await Promise.all([checkDatabaseConnection()]);
    await Promise.all([loadConfig({ loadAll: true}), initQueue()]);
  } catch (error) {
      logger.error('Failed to initialize queues:', error);
      process.exit(1); 
  }
}

initializeQueues();