const {createPool} = require('mysql2/promise');
const createLogger = require('../utilities/logger');
const logger = createLogger('Database');
require('dotenv').config();
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};
read = createPool(dbConfig);
write = createPool(dbConfig);

(async ()=>{
   logger.info("DATABASE CONNECTION SUCCESSFUL")
})()


module.exports = {read , write}




