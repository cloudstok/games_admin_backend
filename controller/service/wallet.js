const axios = require('axios');
const { getRedis } = require('../../redis/connection');
const { encryption } = require('../../utilities/ecryption-decryption');
const { write } = require('../../db_config/db');
const { getWebhookUrl } = require('../../utilities/common_function');
const { sendToQueue} = require('../../utilities/amqp');

const getUserBalance = async (req, res) => {
    try {
        const token = req.headers.token;
        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            console.error("Error parsing Redis token:", err);
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
        }
        if (!validateUser) {
            return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
        }
        const { operatorId } = validateUser;
        const operatorUrl = await getWebhookUrl(operatorId, "GET_BALANCE");
        if (!operatorUrl) {
            return res.status(400).send({ status: false, msg: "No URL configured for the event" });
        }
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
                return res.status(200).send(response.data);
            } else {
                console.log("Received an invalid response from upstream server");
                return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
            }
        } catch (error) {
            console.error("Error during HTTP request:", error);
            return res.status(500).send({ status: false, msg: "Internal Server error" });
        }
    } catch (err) {
        // console.error("Error getting user balance:", err.data);
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}




const updateUserBalance = async (req, res) => {
    try {
        const token = req.headers.token;
        const {  txn_id, amount, txn_ref_id, description, txn_type, game_id } = req.body;
        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            console.error("Error parsing Redis token:", err);
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
        }
        if (!validateUser) {
            return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
        }
        const { operatorId, secret, userId } = validateUser;
        const operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
        if (!operatorUrl) {
            return res.status(400).send({ status: false, msg: "No URL configured for the event" });
        }
        const encryptedData = await encryption({ amount, txn_id, description, txn_type, txn_ref_id  , game_id}, secret);
        const options = {
            method: 'POST',
            url: operatorUrl,
            headers: {
                'Content-Type': 'application/json',
                token
            },
            data: { data: encryptedData }
        };
        let db_data = { ...req.body, userId, token, operatorId}
        const optionsWithRetry = { ...options, db_data};
        await sendToQueue('', 'cashout_queue', JSON.stringify(optionsWithRetry), 1000);
        return res.status(200).send({ status: true, msg: "Balance updated successfully"});
    } catch (err) {
        console.error("Error updating user balance:", err);
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}



module.exports = { getUserBalance, updateUserBalance }