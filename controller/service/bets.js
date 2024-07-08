const axios = require('axios');
const { write } = require('../../db_config/db');
const { getWebhookUrl, createOptions, generateUUIDv7 } = require('../../utilities/common_function');
const { encryption } = require('../../utilities/ecryption-decryption');
const { getRedis } = require('../../redis/connection');


const bets = async (req, res) => {
    try {
        const { limit, offset } = req.query
        let { data } = await axios.get(`${process.env.bets_base_url}?limit=${limit}&offset=${offset}`);
        return res.status(200).send({ statu: true, msg: "Find Data", data: data.data })
    } catch (er) {
        console.error(er);
        return res.status(500).send({ status: false, msg: "internal server Error", er })
    }
}

const manualCashoutOrRollback = async (req, res) => {
    try {
        const { id, event, operator_id } = req.body;
        const [getTransaction] = await write.query(`SELECT * FROM pending_transactions where id = ? and txn_status = '1'`, [id]);
        if (getTransaction.length > 0) {
            let { options, cashout_retries, rollback_retries, transaction_id } = getTransaction[0];
            if (event !== 'cashout' && event !== 'rollback') {
                return res.status(400).send({ status: false, msg: "only cashout or rollback is permitted on transaction" })
            }
            if (event === 'cashout' && cashout_retries >= 10) {
                return res.status(400).send({ status: false, msg: "Maximum cashout retries exceeded" });
            }
            if (event === 'rollback' && rollback_retries >= 10) {
                return res.status(400).send({ status: false, msg: "Maximum rollback retries exceeded" });
            }
            let [operator] = await write.query(`SELECT * FROM operator where user_id = ?`, [operator_id]);
            if (operator.length > 0) {
            let secret = operator[0].secret;
            let data = options;
                let operatorUrl = await getWebhookUrl(operator_id, "UPDATE_BALANCE");
                if (operatorUrl) {
                    // if (event === 'cashout') {
                    //     cashout_retries += 1;
                    //     await write.query(`UPDATE pending_transactions SET cashout_retries = ?, event = ? WHERE id = ?`, [cashout_retries, 'cashout', id]);
                    // } else {
                    //     rollback_retries += 1;
                    //     await write.query(`UPDATE pending_transactions SET rollback_retries = ?, event = ? WHERE id = ?`, [rollback_retries, 'rollback', id]);
                    //     let { token, txn_ref_id } = options;
                    //     let [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [txn_ref_id]);
                    //     if (getRollbackTransaction.length > 1) {
                    //         getRollbackTransaction = getRollbackTransaction[1];
                    //     } else {
                    //         getRollbackTransaction = getRollbackTransaction[0];
                    //         rollbackFlag = 1;
                    //     }
                    //     let rollbackAmount = getRollbackTransaction.amount;
                    //     let transactionId = getRollbackTransaction.txn_type === '2' ? getRollbackTransaction.txn_id : generateUUIDv7();
                    //     data = {
                    //         token, txn_id: transactionId, txn_ref_id, amount: rollbackAmount, description: `${rollbackAmount} Rollback for transaction with reference ID ${txn_ref_id}`, txn_type: 2
                    //     }
                    // }
                    const requestOptions = createOptions(operatorUrl, data);
                    requestOptions.data.data = await encryption(requestOptions.data.data, secret);
                    await axios(requestOptions).then(async (data) => {
                        if (data.status == 200) {
                            await write.query(`UPDATE pending_transactions SET txn_status = '2' where id = ?`, [id]);
                            if (flag == 1) {
                                await write.query(`INSERT INTO transaction (user_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) values (?,?,?,?,?,?,?,?,?)`, [validateUser.userId, data.token, operator_id, data.txn_id, data.amount, data.txn_ref_id, data.description, data.txn_type, '2']);
                            } else {
                                await write.query(`UPDATE transaction SET txn_status = '2' where id = ?`, [transaction_id]);
                            }
                        }
                    }).catch(async (err) => {
                        if (cashout_retries == 10 && rollback_retries == 10) {
                            await write.query(`UPDATE pending_transactions SET txn_status = '0' where id = ?`, [id]);
                        }

                        return res.status(400).send({ status: false, msg: `Request failed from upstream server` })
                    });
                } else {
                    return res.status(400).send({ status: false, msg: "No URL configured for the event" });
                }
            } else {
                return res.status(400).send({ status: false, msg: "Invalid Operator Requested or operator does not exist" });
            }
        } else {
            return res.status(400).send({ status: false, msg: "No pending history found for the transaction id" });
        }

    } catch (er) {
        console.error(er);
        return res.status(500).send({ status: false, msg: "internal server Error", er })
    }
}

module.exports = { bets, manualCashoutOrRollback }