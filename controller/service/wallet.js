const axios = require('axios');
const { getRedis } = require('../../redis/connection');
const { encryption } = require('../../utilities/ecryption-decryption');
const { write } = require('../../db_config/db');
const { getWebhookUrl } = require('../../utilities/common_function');
const { sendToQueue } = require('../../utilities/amqp');
const getLogger = require('../../utilities/logger');
const logger = getLogger('UPDATE_USER_BALANCE', 'jsonl');

const getUserBalance = async (req, res) => {
    const token = req.headers.token;
    logger.info('Received request to get user balance', { token });

    let validateUser;
    try {
        validateUser = JSON.parse(await getRedis(token));
    } catch (err) {
        logger.error('Error parsing Redis token', {
            token,
            error: err.message,
            stack: err.stack
        });
        return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
    }

    if (!validateUser) {
        logger.warn('Invalid token or session timed out', { token });
        return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
    }

    const { operatorId } = validateUser;
    logger.info('Validated user', { operatorId });

    let operatorUrl;
    try {
        operatorUrl = await getWebhookUrl(operatorId, "GET_BALANCE");
    } catch (err) {
        logger.error('Error getting webhook URL', {
            operatorId,
            error: err.message,
            stack: err.stack
        });
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    if (!operatorUrl) {
        logger.error('No URL configured for the event', { operatorId });
        return res.status(400).send({ status: false, msg: "No URL configured for the event" });
    }

    logger.info('Operator URL obtained', { operatorUrl });

    const options = {
        method: 'GET',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token
        }
    };

    try {
        const response = await axios(options);
        if (response.status === 200) {
            logger.info('Successfully fetched user balance', { data: response.data });
            return res.status(200).send(response.data);
        } else {
            logger.warn('Invalid response from upstream server', { status: response.status, data: response.data });
            return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
        }
    } catch (error) {
        logger.error('Error during HTTP request', {
            error: error.message,
            response: error.response ? error.response.data : 'No response data',
            stack: error.stack
        });
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
};



const updateUserBalance = async (req, res) => {
    const token = req.headers.token;
    const { txn_id, amount, txn_ref_id, description, txn_type, ip, game_id, socket_id, bet_id } = req.body;

    logger.info('Received request to update user balance', { token, txn_id, amount, txn_type });

    let validateUser;
    try {
        validateUser = JSON.parse(await getRedis(token));
    } catch (err) {
        logger.error('Error parsing Redis token', {
            token,
            error: err.message,
            stack: err.stack
        });
        return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
    }

    if (!validateUser) {
        logger.warn('Invalid token or session timed out', { token });
        return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
    }

    const { operatorId, secret, userId } = validateUser;
    logger.info('Validated user', { operatorId, userId });

    let operatorUrl;
    try {
        operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
    } catch (err) {
        logger.error('Error getting webhook URL', {
            operatorId,
            error: err.message,
            stack: err.stack
        });
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    if (!operatorUrl) {
        logger.error('No URL configured for the event', { operatorId });
        return res.status(400).send({ status: false, msg: "No URL configured for the event" });
    }

    logger.info('Operator URL obtained', { operatorUrl });

    let encryptedData;
    try {
        encryptedData = await encryption({ amount, txn_id, description, txn_type, txn_ref_id, ip, game_id }, secret);
    } catch (err) {
        logger.error('Error encrypting data', {
            data: { amount, txn_id, description, txn_type, txn_ref_id, ip, game_id },
            error: err.message,
            stack: err.stack
        });
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    const options = {
        method: 'POST',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token
        },
        data: { data: encryptedData }
    };

    let db_data = { ...req.body, userId, token, operatorId, socket_id, bet_id };
    const optionsWithRetry = { ...options, db_data };
    let queue = txn_type === 0 ? 'debit_queue' : 'cashout_queue';

    logger.info('Sending data to queue', { queue, optionsWithRetry });

    try {
        await sendToQueue('', queue, JSON.stringify(optionsWithRetry), 1000);
        logger.info('Successfully sent to queue', { queue, optionsWithRetry });
        return res.status(200).send({ status: true, msg: "Balance updated successfully" });
    } catch (err) {
        logger.error('Error sending to queue', {
            queue,
            error: err.message,
            stack: err.stack
        });
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
};


module.exports = { getUserBalance, updateUserBalance }