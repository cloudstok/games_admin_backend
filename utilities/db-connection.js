const { createPool } = require('mysql2/promise');
const createLogger = require('./logger');
const logger = createLogger('Database');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

const maxRetries = Number(process.env.DB_MAX_RETRIES); 
const retryInterval = Number(process.env.MAX_RETRY_INTERVAL); 

let readPool;
let writePool;

const createDatabasePool = async (config) => {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return createPool(config);
        } catch (err) {
            attempts += 1;
            logger.error(`Failed to create database pool. Retry ${attempts}/${maxRetries}. Error: ${err.message}`);
            if (attempts >= maxRetries) {
                logger.error("Maximum retries reached. Could not connect to the database.");
                process.exit(1);
            }
            await new Promise(res => setTimeout(res, retryInterval));
        }
    }
};

const initializePools = async () => {
    try {
        readPool = await createDatabasePool(dbConfig);
        writePool = await createDatabasePool(dbConfig);
        logger.info("DATABASE CONNECTION SUCCESSFUL");
    } catch (err) {
        logger.error('Failed to initialize database pools:', err);
        process.exit(1);
    }
};

const executeQuery = async (pool, query, params = []) => {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            const connection = await pool.getConnection();
            try {
                const results = await connection.query(query, params);
                connection.release();
                return results;
            } finally {
                connection.release(); 
            }
        } catch (err) {
            attempts += 1;
            logger.error(`Failed to execute query. Retry ${attempts}/${maxRetries}. Error: ${err.message}`);
            if (attempts >= maxRetries) {
                logger.error("Maximum retries reached. Could not execute query.");
                throw err; 
            }
            await new Promise(res => setTimeout(res, retryInterval));
        }
    }
};

const read = async (query, params = []) => {
    return await executeQuery(readPool, query, params);
};

const write = async (query, params = []) => {
    return await executeQuery(writePool, query, params);
};

const checkDatabaseConnection = async () => {
    await initializePools();
    console.info("Database connection checks passed for all databases");
};

module.exports = { read, write, checkDatabaseConnection };
