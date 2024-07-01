const axios = require('axios');
const { getRedis } = require('../../redis/connection');
const { encryption } = require('../../utilities/ecryption-decryption');
const { write } = require('../../db_config/db');
const { getWebhookUrl } = require('../../utilities/common_function');

const getUserBalance = async (req, res) => {
    try {
        const token = req.headers.token;
        let validateUser = await getRedis(token);
        try {
            validateUser = JSON.parse(validateUser);
        } catch (err) {
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" })
        }
        if (validateUser) {
            const { operatorId } = validateUser;
            let operatorUrl = await getWebhookUrl(operatorId, "GET_BALANCE")
            if (operatorUrl) {
                const options = {
                    method: 'GET',
                    url: operatorUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        token
                    }
                };

                await axios(options).then(data => {
                    if (data.status === 200) {
                        return res.status(200).send(data.data);
                    } else {
                        console.log(`received an invalid response from upstream server`);
                        return res.status(data.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                    }
                }).catch(err => {
                    return res.status(400).send(err?.response?.data);
                })
            } else {
                return res.status(400).send({ status: false, msg: "No URL configured for the event" });
            }
        } else {
            return res.status(400).send({ status: false, msg: "Invalid Token or session timed out" });
        }
    } catch (err) {
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}

const updateUserBalance = async (req, res) => {
    try {
        const token = req.headers.token;
<<<<<<< HEAD
        const { balance, txn_id, description, txn_type } = req.body;
=======
        const { amount , txn_id , description, txn_type } = req.body;
>>>>>>> 0af196db1b846786260fd925a2a2d6c9135af891
        let validateUser = await getRedis(token);
        try {
            validateUser = JSON.parse(validateUser);
        } catch (err) {
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" })
        }
        if (validateUser) {
            const { operatorId, secret, userId } = validateUser;
            const operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
<<<<<<< HEAD
            let encryptedData = await encryption({ balance, txn_id, description, txn_type }, secret);
            if (operatorUrl) {
=======
            let encryptedData = await encryption({ amount , txn_id , description, txn_type }, secret);
            if(operatorUrl){
>>>>>>> 0af196db1b846786260fd925a2a2d6c9135af891
                const options = {
                    method: 'POST',
                    url: operatorUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        token
                    },
                    data: {
                        data: encryptedData

                    }
                };
                await axios(options).then(async data => {
                    // userId, balance , update , operatorId, url , data
                    // history transaction 
<<<<<<< HEAD
                    const sql_transaction = "INSERT INTO transaction (userId, balance, operatorId, data , txn_id ,  description, txn_type) VALUES (? ,?, ?, ? ,? , ?, ?)";
                    await write.query(sql_transaction, [userId, balance, operatorId, JSON.stringify(data?.data), txn_id, description, txn_type])
=======
                   let sql = "INSERT INTO transaction (userId, balance, operatorId, data , txn_id ,  description, txn_type) VALUES (? ,?, ?, ? ,? , ?, ?)";
                     await write.query(sql , [ userId, amount  , operatorId, JSON.stringify(data?.data) , txn_id , description, txn_type])
>>>>>>> 0af196db1b846786260fd925a2a2d6c9135af891
                    if (data.status === 200) {
                        return res.status(200).send(data.data);
                    } else {
                        console.log(`received an invalid response from upstream server`);
                        return res.status(data.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                    }
                }).catch(async err => {
                    let data = err?.response?.data
<<<<<<< HEAD
                    const sql_transaction = "INSERT INTO transaction (userId, balance, operatorId, data,  txn_id ,  description, txn_type) VALUES (? ,?, ?, ? ,?,?,?)";

                    const sql_rollback_detail = "INSERT INTO rollback_detail (game_url, options) VALUES (?, ?, ? , ?)"

                    await write.query(sql_transaction, [userId, balance, operatorId, JSON.stringify(data?.data), txn_id, description, txn_type])
                    await write.query(sql_rollback_detail, [req.url, options])
                    return res.status(500).send({ status: false, msg: "Internal Server error" });
                    console.error(`[ERR] while updating user balance from operator is::`, JSON.stringify(err))
                    // return res.status(500).send({ status: false, msg: "We've encountered an internal error" });
=======
                    let sql = "INSERT INTO transaction (userId, balance, operatorId, data,  txn_id ,  description, txn_type) VALUES (? ,?, ?, ? ,?,?,?)";
                    await write.query(sql , [ userId, amount  , operatorId, JSON.stringify(data?.data), txn_id , description, txn_type])
                    return res.status(500).send( {status:false , msg : "Internal Server error"} );
                   // console.error(`[ERR] while updating user balance from operator is::`, JSON.stringify(err))
                   // return res.status(500).send({ status: false, msg: "We've encountered an internal error" });
>>>>>>> 0af196db1b846786260fd925a2a2d6c9135af891
                })
            } else {
                return res.status(400).send({ status: false, msg: "No URL configured for the event" });
            }
        } else {
            return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
        }
    } catch (err) {
        console.error(`[Err] while trying to update user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}

module.exports = { getUserBalance, updateUserBalance }