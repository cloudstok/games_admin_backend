const axios = require('axios');
const { write } = require('../../db_config/db');
const { getWebhookUrl, createOptions, generateUUIDv7 } = require('../../utilities/common_function');
const { encryption, decryption } = require('../../utilities/ecryption-decryption');
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
                    if (event === 'cashout') {
                        cashout_retries += 1;
                        await write.query(`UPDATE pending_transactions SET cashout_retries = ?, event = ? WHERE id = ?`, [cashout_retries, 'cashout', id]);
                    } else {
                        rollback_retries += 1;
                        await write.query(`UPDATE pending_transactions SET rollback_retries = ?, event = ? WHERE id = ?`, [rollback_retries, 'rollback', id]);
                        let { token, txn_ref_id } = options;
                        let [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [txn_ref_id]);
                        if (getRollbackTransaction.length > 1) {
                            getRollbackTransaction = getRollbackTransaction[1];
                        } else {
                            getRollbackTransaction = getRollbackTransaction[0];
                            rollbackFlag = 1;
                        }
                        let rollbackAmount = getRollbackTransaction.amount;
                        let transactionId = getRollbackTransaction.txn_type === '2' ? getRollbackTransaction.txn_id : generateUUIDv7();
                        data = {
                            token, txn_id: transactionId, txn_ref_id, amount: rollbackAmount, description: `${rollbackAmount} Rollback for transaction with reference ID ${txn_ref_id}`, txn_type: 2
                        }
                    }
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

const operatorRollback = async (req, res) => {
    try {
        const { token } = req.headers;
        const { data } = req.body;
        let validateUser = await getRedis(token);
        validateUser = JSON.parse(validateUser)
        if (validateUser) {
            const { userId, operatorId } = validateUser;
            const [getOperator] = await write.query(`SELECT * FROM operator WHERE user_id = ?`, [operatorId]);
            if (getOperator.length > 0) {
                let secret = getOperator[0].secret;
                const decodeData = await decryption(data, secret);
                let txn_ref_id = decodeData.txnRefId;
                const [getPendingTransaction] = await write.query(`SELECT * FROM transaction as tr inner join pending_transactions as pt on pt.transaction_id = tr.id inner join games_master_list as gm on gm.game_id = pt.game_id WHERE tr.txn_ref_id = ? and tr.txn_type = '1' and tr.txn_status = '1'`, [txn_ref_id]);
                if (getPendingTransaction.length > 0) {
                    let [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [txn_ref_id]);
                    let rollbackAmount = getRollbackTransaction[0].amount;
                    const transactionId = await generateUUIDv7();
                    let data = {
                         txn_id: transactionId, txn_ref_id, amount: rollbackAmount, description: `${rollbackAmount} Rollback-ed for transaction with reference ID ${txn_ref_id}`, txn_type: 2
                    };
                    const encryptedData = await encryption(data, secret);
                    const options = {
                        method: 'POST',
                        url: getPendingTransaction[0].backend_base_url + '/settleBet',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: {
                            ...data, userId, operatorId, rollbackMsg: getRollbackTransaction[0].description
                        }
                    };
                    await axios(options).then(async data => {
                        if (data.status === 200) {
                            const insertTransaction = write.query(`INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)`, [[userId, token, operatorId, transactionId, rollbackAmount, txn_ref_id, data.description, '2', '2']]);
                            const updatePendingTransaction = write.query(`UPDATE pending_transactions SET event = 'rollback', txn_status = '2' WHERE transaction_id = ?`, [getPendingTransaction[0].transaction_id]);
                            const updateTransaction = write.query(`UPDATE transaction SET txn_status = '0' where id = ?`, [getPendingTransaction[0].transaction_id]);
                            await Promise.all([insertTransaction, updatePendingTransaction, updateTransaction]);
                            return res.status(200).send({ status: true, msg: `Bet rollback-ed successfully for reference ID ${txn_ref_id}`, data: encryptedData});
                        } else {
                            console.log(`received an invalid response from upstream server`);
                            return res.status(data.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                        }
                    }).catch(async err => {
                        return res.status(500).send({ status: false, msg: "Request failed from upstream server", err});
                    })
                } else {
                    return res.status(400).send({ status: false, msg: "No Pending Credits for this Reference ID" });
                }
            } else {
                return res.status(400).send({ status: false, msg: "Request initiated for Invalid Operator" });
            }
        } else {
            return res.status(401).send({ status: false, msg: "Token Expired or Request timed out.!" });
        }
    } catch (er) {
        console.error(er);
        return res.status(500).send({ status: false, msg: "internal server Error", er })
    }
}

module.exports = { bets, operatorRollback, manualCashoutOrRollback }