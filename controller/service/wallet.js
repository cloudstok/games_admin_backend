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
        let { amount, txn_id, description, txn_ref_id, txn_type } = req.body;
        txn_type = '' + txn_type
        let validateUser = await getRedis(token);
        try {
            validateUser = JSON.parse(validateUser);
        } catch (err) {
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" })
        }
        if (validateUser) {
            const { operatorId, secret, userId } = validateUser;
            const operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
            let encryptedData = await encryption({ amount, txn_id, description, txn_type, txn_ref_id }, secret);
            if (operatorUrl) {
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
                    //here insert data in to transaction
                    // await rollback( [req.url, JSON.stringify(options)])
                    if (data.status === 200) {
                    await transaction([userId, token , operatorId, txn_id, amount,  txn_ref_id , description, txn_type, 2]);

                        return res.status(200).send(data.data);
                    } else {
                        // here store data for rollback 
                        await transaction([userId, token , operatorId, txn_id, amount,  txn_ref_id , description, txn_type, 1]);
                        console.log(`received an invalid response from upstream server`);
                        return res.status(data.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                    }
                }).catch(async err => {
                    let data = err?.response?.data
                    //here insert data in to transaction
                 const transaction_id =  await transaction([userId, token , operatorId, txn_id, amount,  txn_ref_id , description, txn_type, 1]);
                  await rollback( [ transaction_id ,  2, JSON.stringify(options)])
                    return res.status(500).send({ status: false, msg: "Internal Server error" });
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

const transaction = async (data) => {
    try {
        let sql = "INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)";
        await write.query(sql, [data])
    } catch (e) {
        console.error(e);
    }
}

const rollback = async (data) => {
    try {
        const sql_rollback_detail = "INSERT IGNORE INTO pending_transactions ( transaction_id , backend_base_url, options ) VALUES ( ? )"
       const [{ InsertedId}]  = await write.query(sql_rollback_detail, [data])
      return InsertedId
    } catch (e) {
        console.error(e);
    }
}

module.exports = { getUserBalance, updateUserBalance }