const axios = require('axios');
const { getRedis } = require('../../redis/connection');
const { encryption } = require('../../utilities/ecryption-decryption');
const { write } = require('../../db_config/db');
const { getWebhookUrl } = require('../../utilities/common_function');

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
        const { amount, txn_id, description, txn_ref_id, txn_type } = req.body;
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
        const encryptedData = await encryption({ amount, txn_id, description, txn_type, txn_ref_id }, secret);
        const options = {
            method: 'POST',
            url: operatorUrl,
            headers: {
                'Content-Type': 'application/json',
                token
            },
            data: { data: encryptedData }
        };
        let status = 0;
        // Execute HTTP request with Axios
        await axios(options).then(async (response) => {
            if (response.status === 200) {
                status = 2;
                await transaction([userId, token, operatorId, txn_id, amount, txn_ref_id || null, description, txn_type, status]);
            } else {
                status = txn_type === 1 ? 1 : 0;
                const transaction_id = await transaction([userId, token, operatorId, txn_id, amount, txn_ref_id || null, description, txn_type, status]);
                if (status === 1) {
                    await rollback([transaction_id, 2, JSON.stringify({ ...req.body, token })]);
                }
                console.log(`Received an invalid response from upstream server`);
            }

            return res.status(response.status).send(response.data);
        }).catch(async (err) => {
            console.error("Error during HTTP request:", err);
            status = txn_type === 1 ? 1 : 0;
            const transaction_id = await transaction([userId, token, operatorId, txn_id, amount, txn_ref_id || null, description, txn_type, status]);
            if (status === 1) {
                await rollback([transaction_id, 2, JSON.stringify({ ...req.body, token })]);
            }
            return res.status(500).send({ status: false, msg: "Internal Server error" });
        });
    } catch (err) {
        console.error("Error updating user balance:", err);
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}



const transaction = async (data) => {
    try {
        let sql = "INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)";
        const [{ insertId }] = await write.query(sql, [data])
        return insertId
    } catch (e) {
        console.error("Error while inserting transaction:", error);
        throw new Error("Failed to execute transaction insertion");
    }
}

const rollback = async (data) => {
    try {
        const sql_rollback_detail = "INSERT IGNORE INTO pending_transactions (transaction_id, game_id, options) VALUES (?)";
        const [{ insertId }] = await write.query(sql_rollback_detail, [data]);
        return insertId;
    } catch (error) {
        console.error("Error during rollback:", error);
        throw new Error("Failed to execute rollback operation");
    }
}


module.exports = { getUserBalance, updateUserBalance }