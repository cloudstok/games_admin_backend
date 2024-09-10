require('dotenv').config();
const createLogger = require('./utilities/logger');
const logger = createLogger('Consumer');
const { consumeQueue, connect, handleMessage } = require('./utilities/amqp');



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
      process.exit(1); 
  }
}

initializeQueues();