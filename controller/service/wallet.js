const axios = require('axios');
const { getRedis } = require('../../utilities/redis-connection');
const { encryption } = require('../../utilities/ecryption-decryption');
const { write, read } = require('../../utilities/db-connection');
const { getWebhookUrl, generateUUIDv7, getLobbyFromDescription } = require('../../utilities/common_function');
const { sendToQueue } = require('../../utilities/amqp');
const getLogger = require('../../utilities/logger');
const { variableConfig } = require('../../utilities/load-config');
const userBalanceLogger = getLogger('Get_User_Balance', 'jsonl');
const failedUserBalanceLogger = getLogger('Failed_Get_User_Balance', 'jsonl');
const updateBalanceLogger = getLogger('User_Update_Balance', 'jsonl');
const failedUpdateBalanceLogger = getLogger('Failed_User_Update_Balance', 'jsonl');
const thirdPartyLogger = getLogger('Third_Party_Data', 'jsonl');
const failedThirdPartyLogger = getLogger('Failed_Third_Party_Data', 'jsonl');


const getUserBalance = async (req, res) => {
    const logId = await generateUUIDv7();
    const token = req.headers.token;
    let logDataReq = { logId, token };
    userBalanceLogger.info(JSON.stringify(logDataReq));

    let validateUser;
    try {
        validateUser = JSON.parse(await getRedis(token));
    } catch (err) {
        failedUserBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error parsing Redis token' }));
        return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
    }

    if (!validateUser) {
        failedUserBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Invalid token or session timed out' }));
        return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
    }

    const { operatorId, userId } = validateUser;

    let operatorUrl;
    try {
        operatorUrl = await getWebhookUrl(operatorId, "GET_BALANCE");
    } catch (err) {
        failedUserBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error while fetching webhook URL' }));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    if (!operatorUrl) {
        failedUserBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'No URL configured for the event' }));
        return res.status(400).send({ status: false, msg: "No URL configured for the event" });
    }


    const options = {
        method: 'GET',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token,
            'x-user-id': userId
        }
    };

    try {
        const response = await axios(options);
        if (response.status === 200) {
            userBalanceLogger.info(JSON.stringify({ req: logDataReq, res: response?.data }));
            return res.status(200).send(response.data);
        } else {
            failedUserBalanceLogger.error(JSON.stringify({ req: logDataReq, res: response?.data }));
            return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
        }
    } catch (error) {
        let response = error.response ? error.response.data : err;
        failedUserBalanceLogger.error(JSON.stringify({ req: logDataReq, res: response }));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
};



const updateUserBalance = async (req, res) => {
    const logId = await generateUUIDv7();
    const token = req.headers.token;
    if (!token) {
        return res.status(400).send({ status: false, msg: "Missing token in headers" });
    }
    const { txn_id, amount, txn_ref_id, description, txn_type, ip, game_id, socket_id, bet_id, user_id } = req.body;
    let game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;
    if (!game_code) {
        return res.status(400).send({ status: false, msg: "No game code is available for the game" });
    }
    let logDataReq = { logId, token, body: req.body };
    updateBalanceLogger.info(JSON.stringify(logDataReq));

    let validateUser;
    try {
        validateUser = JSON.parse(await getRedis(token));
    } catch (err) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error parsing Redis token' }));
        return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
    }

    if (!validateUser) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Invalid token or session timed out' }));
        return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
    }

    const { operatorId, secret, userId } = validateUser;

    let operatorUrl;
    try {
        operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
    } catch (err) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error while fetching webhook URL' }));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    if (!operatorUrl) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'No URL configured for the event' }));
        return res.status(400).send({ status: false, msg: "No URL configured for the event" });
    }


    let encryptedData;
    try {
        encryptedData = await encryption({ amount, txn_id, description, txn_type, txn_ref_id, ip, game_id, user_id, game_code }, secret);
    } catch (err) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error while encrypting data' }));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    const options = {
        method: 'POST',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token,
            'x-user-id': userId
        },
        timeout: 1000 * 3,
        data: { data: encryptedData }
    };

    let db_data = { ...req.body, userId, token, operatorId, socket_id, bet_id };
    const optionsWithRetry = { ...options, db_data };
    let queue = txn_type === 0 ? 'debit_queue' : 'cashout_queue';

    try {
        await sendToQueue('', queue, JSON.stringify(optionsWithRetry), 1000);
        updateBalanceLogger.info(JSON.stringify({ req: logDataReq, res: 'Balance updated successfully' }));
        return res.status(200).send({ status: true, msg: "Balance updated successfully" });
    } catch (err) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error sending to queue' }));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
};

const updateUserBalanceV2 = async (req, res) => {
    const logId = await generateUUIDv7();
    const token = req.headers.token;
    if (!token) {
        return res.status(400).send({ status: false, msg: "Missing token in headers" });
    }
    const { txn_id, amount, description, txn_type, ip, game_id, user_id, txn_ref_id } = req.body;
    const txnRefId = txn_ref_id || null;
    const lobby_id = description ? getLobbyFromDescription(description) : "";
    let game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;
    if (!game_code) {
        return res.status(400).send({ status: false, msg: "No game code is available for the game" });
    }

    if(isNaN(Number(amount)) || Number(amount) <= 0) return res.status(400).send({ status: false, msg: 'Invalid transaction amount'});

    let logDataReq = { logId, token, body: req.body };
    updateBalanceLogger.info(JSON.stringify(logDataReq));

    let validateUser;
    try {
        validateUser = JSON.parse(await getRedis(token));
    } catch (err) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error parsing Redis token' }));
        return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
    }

    if (!validateUser) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Invalid token or session timed out' }));
        return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
    }

    const { operatorId, secret, userId, createdAt } = validateUser;

    let timeDifferenceInHours = (Date.now() - createdAt) / (1000 * 60 * 60);

    if (timeDifferenceInHours > (16 - 4)) {
        return res.status(400).send({ status: false, msg: "Session Timed Out.!" });
    }

    let operatorUrl;
    try {
        operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
    } catch (err) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error while fetching webhook URL' }));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    if (!operatorUrl) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'No URL configured for the event' }));
        return res.status(400).send({ status: false, msg: "No URL configured for the event" });
    }


    const betData = { amount, txn_id, description, txn_type, ip, game_id, user_id, game_code };
    if (txnRefId) betData.txn_ref_id = txnRefId;
    let encryptedData;
    try {
        encryptedData = await encryption(betData, secret);
    } catch (err) {
        failedUpdateBalanceLogger.error(JSON.stringify({ req: logDataReq, res: 'Error while encrypting data' }));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    const options = {
        method: 'POST',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token,
            'x-user-id': userId
        },
        timeout: 1000 * 3,
        data: { data: encryptedData }
    };

    try {
        const response = await axios(options);
        //Inserting Success queries to Database
        thirdPartyLogger.info(JSON.stringify({ req: { ...logDataReq, ...options }, res: response?.data }));
        await write("INSERT IGNORE INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[userId, game_id, token, operatorId, txn_id, amount, lobby_id, txnRefId, description, `${txn_type}`, '2']]);
        return res.status(200).send({ status: true, msg: 'Balance updated successfully' });
    } catch (err) {
        const objForErr = {
            req: logDataReq,
            res4: JSON.parse(JSON.stringify(err?.response?.data || {})),
            statusCode: "" + err?.response?.status + " " + err?.code,
            message: err.message || "Unkown Error",
            stack: err.stack
        }
        const span = process.tracer.scope().active();
        span.setTag('error', err);
        failedThirdPartyLogger.error(JSON.stringify(objForErr));
        await write("INSERT IGNORE INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[userId, game_id, token, operatorId, txn_id, amount, lobby_id, txnRefId, description, `${txn_type}`, '0']]);
        await sendToQueue('', 'games_rollback', JSON.stringify({ ...req.body, token, game_code, operatorUrl, secret, operatorId }), 100);
        return res.status(500).send({ status: false, msg: err?.response?.data?.message || "Internal Server error" });
    }
};


module.exports = { getUserBalance, updateUserBalance, updateUserBalanceV2 }