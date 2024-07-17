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

//Admin Rollback or Cashout Retry
const manualCashoutOrRollback = async (req, res) => {
    try {
        const { id, event, operator_id, description, amount, txn_ref_id, user_id, session_token, backend_base_url } = req.body;
        const [getTransaction] = await write.query(`SELECT * FROM pending_transactions where id = ? and txn_status = '1'`, [id]);
        if (getTransaction.length === 0) {
            return res.status(400).send({ status: false, msg: "No pending history found for the transaction id" });
        }
        const transaction = getTransaction[0];
        if (!isValidEvent(event)) {
            return res.status(400).send({ status: false, msg: "only cashout or rollback is permitted on transaction" });
        }
        if (isRetryLimitExceeded(event, transaction)) {
            return res.status(400).send({ status: false, msg: `Maximum ${event} retries exceeded` });
        }
        const [operator] = await write.query(`SELECT * FROM operator where user_id = ?`, [operator_id]);
        if (operator.length === 0) {
            return res.status(400).send({ status: false, msg: "Invalid Operator Requested or operator does not exist" });
        }
        const secret = operator[0].secret;
        const operatorUrl = await getWebhookUrl(operator_id, "UPDATE_BALANCE");
        if (!operatorUrl) {
            return res.status(400).send({ status: false, msg: "No URL configured for the event" });
        }
        await processEvent({ event, transaction, operatorUrl, secret, amount, description, txn_ref_id, user_id, session_token, backend_base_url, operator_id, id, res });
    } catch (er) {
        console.error(er);
        return res.status(500).send({ status: false, msg: "internal server Error", er });
    }
};

const isValidEvent = (event) => {
    return event === 'cashout' || event === 'rollback';
};

const isRetryLimitExceeded = (event, transaction) => {
    const { cashout_retries, rollback_retries } = transaction;
    return (event === 'cashout' && cashout_retries >= 10) || (event === 'rollback' && rollback_retries >= 10);
};

const processEvent = async ({ event, transaction, operatorUrl, secret, amount, description, txn_ref_id, user_id, session_token, backend_base_url, operator_id, id, res }) => {
    let { options, cashout_retries, rollback_retries, transaction_id } = transaction;
    event === 'cashout' ? cashout_retries += 1 : rollback_retries += 1;
    const [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [txn_ref_id]);
    const txn_id = await generateUUIDv7();
    const settleAmount = event === 'cashout' ? amount : getRollbackTransaction[0].amount;
    const settleDescription = event === 'cashout' ? description : `${amount} Rollback-ed for transaction with reference ID ${txn_ref_id}`;
    const txn_type = event === 'cashout' ? 1 : 2;
    const webhookData = { txn_id, amount: settleAmount, txn_ref_id, description: settleDescription, txn_type, token: options.token };
    const requestOptions = createOptions(operatorUrl, webhookData);
    requestOptions.data.data = await encryption(requestOptions.data.data, secret);
    await write.query(`UPDATE pending_transactions SET cashout_retries = ?, rollback_retries = ? WHERE id = ?`, [cashout_retries, rollback_retries, id]);
    try {
        const data = await axios(requestOptions);
        if (data.status === 200) {
            await handleSuccessEvent({ event, webhookData, backend_base_url, user_id, operator_id, getRollbackTransaction, id, transaction_id, res });
        } else {
            await handleErrorEvent(event, cashout_retries, rollback_retries, transaction_id, id, res);
        }
    } catch (err) {
        await handleErrorEvent(event, cashout_retries, rollback_retries, transaction_id, id, res);
    }
};

const handleSuccessEvent = async ({ event, webhookData, backend_base_url, user_id, operator_id, getRollbackTransaction, id, transaction_id, res }) => {
    delete webhookData.token;
    const options = {
        method: 'POST',
        url: backend_base_url + '/settleBet',
        headers: {
            'Content-Type': 'application/json',
        },
        data: {
            ...webhookData,
            userId: user_id,
            operatorId: operator_id,
            rollbackMsg: event === 'cashout' ? null : getRollbackTransaction[0].description
        }
    };
    try {
        const data = await axios(options);
        if (data.status === 200) {
            console.log(`[SUCCESS] Response from game for ${event} event is:::`, JSON.stringify(data.data));
        } else {
            console.log(`[Error] Response from game for ${event} event is:::`, JSON.stringify(data.data));
        }
    } catch (err) {
        console.error(`[Error] Response from game for ${event} event is:::`, JSON.stringify(err?.response?.data));
    }
    await finalizeTransaction(event, webhookData, transaction_id, id, user_id, session_token, operator_id);
    return res.status(200).send({ status: true, msg: `Bet successfully settled for ${event} event` });
};

const handleErrorEvent = async (transaction_id, id, res) => {
    if (cashout_retries >= 10 && rollback_retries >= 10) {
        const updateTransaction = write.query(`UPDATE transaction SET txn_status = '0' where id = ?`, [transaction_id]);
        const updatePendingTransaction = write.query(`UPDATE pending_transactions SET txn_status = '0' where id = ?`, [id]);
        await Promise.all([updateTransaction, updatePendingTransaction]);
    }
    return res.status(400).send({ status: false, msg: `Request failed from Operator upstream server` });
};

const finalizeTransaction = async (event, webhookData, transaction_id, id, user_id, session_token, operator_id) => {
    if (event === 'cashout') {
        const updateTransaction = write.query(`UPDATE transaction SET txn_id = ?, txn_status = '2' where id = ?`, [webhookData.txn_id, transaction_id]);
        const updatePendingTransaction = write.query(`UPDATE pending_transactions SET event = 'cashout', txn_status = '2' where id = ?`, [id]);
        await Promise.all([updateTransaction, updatePendingTransaction]);
    } else {
        webhookData.txn_type = `${webhookData.txn_type}`;
        const insertRollbackTransaction = write.query(`INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount, txn_ref_id , description, txn_type, txn_status) VALUES (?)`, [[user_id, session_token, operator_id, ...webhookData, '2']]);
        const updateTransaction = write.query(`UPDATE transaction SET txn_status = '0' where id = ?`, [transaction_id]);
        const updatePendingTransaction = write.query(`UPDATE pending_transactions SET event = 'rollback', txn_status = '2' where id = ?`, [id]);
        await Promise.all([insertRollbackTransaction, updateTransaction, updatePendingTransaction]);
    }
};


// Operator Rollback
const operatorRollback = async (req, res) => {
    try {
        const { token } = req.headers;
        const { data } = req.body;
        const validateUser = await getValidatedUser(token);
        if (!validateUser) {
            return res.status(401).send({ status: false, msg: "Token Expired or Request timed out.!" });
        }
        const { userId, operatorId } = validateUser;
        const operator = await getOperator(operatorId);
        if (!operator) {
            return res.status(400).send({ status: false, msg: "Request initiated for Invalid Operator" });
        }
        const secret = operator.secret;
        const decodeData = await decryption(data, secret);
        const txn_ref_id = decodeData.txnRefId;
        const pendingTransaction = await getPendingTransaction(txn_ref_id);
        if (pendingTransaction.length === 0) {
            return res.status(400).send({ status: false, msg: "No Pending Credits for this Reference ID" });
        }
        const rollbackTransaction = await getRollbackTransaction(txn_ref_id);
        if (rollbackTransaction.length === 0) {
            return res.status(400).send({ status: false, msg: "No transaction found for the given reference ID" });
        }
        const rollbackAmount = rollbackTransaction[0].amount;
        const transactionId = await generateUUIDv7();
        const transactionData = {
            txn_id: transactionId,
            txn_ref_id,
            amount: rollbackAmount,
            description: `${rollbackAmount} Rollback-ed for transaction with reference ID ${txn_ref_id}`,
            txn_type: 2
        };

        const response = await sendRollbackRequest(pendingTransaction[0].backend_base_url, transactionData, userId, operatorId, rollbackTransaction[0].description, token, secret);
        if (response?.status === 200) {
            await finalizeRollback(userId, token, operatorId, transactionId, rollbackAmount, txn_ref_id, transactionData.description, pendingTransaction[0].transaction_id);
            return res.status(200).send({ status: true, msg: `Bet rollback-ed successfully for reference ID ${txn_ref_id}`, data: await encryption(transactionData, secret) });
        } else {
            return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(response.data)}` });
        }
    } catch (er) {
        console.error(er);
        return res.status(500).send({ status: false, msg: "internal server Error", er });
    }
};

const getValidatedUser = async (token) => {
    try {
        let validateUser = await getRedis(token);
        return JSON.parse(validateUser);
    } catch (error) {
        console.error('Error validating user:', error);
        throw new Error('User validation failed');
    }
};

const getOperator = async (operatorId) => {
    try {
        const [getOperator] = await write.query(`SELECT * FROM operator WHERE user_id = ?`, [operatorId]);
        return getOperator.length > 0 ? getOperator[0] : null;
    } catch (error) {
        console.error('Error fetching operator:', error);
        throw new Error('Operator fetch failed');
    }
};

const getPendingTransaction = async (txn_ref_id) => {
    try {
        const [getPendingTransaction] = await write.query(`SELECT * FROM transaction as tr inner join pending_transactions as pt on pt.transaction_id = tr.id inner join games_master_list as gm on gm.game_id = pt.game_id WHERE tr.txn_ref_id = ? and tr.txn_type = '1' and tr.txn_status = '1'`, [txn_ref_id]);
        return getPendingTransaction;
    } catch (error) {
        console.error('Error fetching pending transaction:', error);
        throw new Error('Pending transaction fetch failed');
    }
};

const getRollbackTransaction = async (txn_ref_id) => {
    try {
        const [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [txn_ref_id]);
        return getRollbackTransaction;
    } catch (error) {
        console.error('Error fetching rollback transaction:', error);
        throw new Error('Rollback transaction fetch failed');
    }
};

const sendRollbackRequest = async (backendBaseUrl, data, userId, operatorId, rollbackMsg, token, secret) => {
    try {
        const options = {
            method: 'POST',
            url: `${backendBaseUrl}/settleBet`,
            headers: { 'Content-Type': 'application/json' },
            data: { ...data, userId, operatorId, rollbackMsg }
        };
        return await axios(options);
    } catch (error) {
        console.error('Error sending rollback request:', error?.response?.data);
        throw new Error('Rollback request failed');
    }
};

const finalizeRollback = async (userId, token, operatorId, transactionId, rollbackAmount, txn_ref_id, description, pendingTransactionId) => {
    try {
        const insertTransaction = write.query(`INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount, txn_ref_id , description, txn_type, txn_status) VALUES (?)`, [[userId, token, operatorId, transactionId, rollbackAmount, txn_ref_id, description, '2', '2']]);
        const updatePendingTransaction = write.query(`UPDATE pending_transactions SET event = 'rollback', txn_status = '2' WHERE transaction_id = ?`, [pendingTransactionId]);
        const updateTransaction = write.query(`UPDATE transaction SET txn_status = '0' where id = ?`, [pendingTransactionId]);
        await Promise.all([insertTransaction, updatePendingTransaction, updateTransaction]);
    } catch (error) {
        console.error('Error finalizing rollback:', error);
        throw new Error('Rollback finalization failed');
    }
};

// const manualCashoutOrRollback = async (req, res) => {
//     try {
//         const { id, event, operator_id, description, amount, txn_ref_id, user_id, session_token, backend_base_url } = req.body;
//         const [getTransaction] = await write.query(`SELECT * FROM pending_transactions where id = ? and txn_status = '1'`, [id]);
//         if (getTransaction.length > 0) {
//             let { options, cashout_retries, rollback_retries, transaction_id } = getTransaction[0];
//             if (event !== 'cashout' && event !== 'rollback') {
//                 return res.status(400).send({ status: false, msg: "only cashout or rollback is permitted on transaction" })
//             }
//             if (event === 'cashout' && cashout_retries >= 10) {
//                 return res.status(400).send({ status: false, msg: "Maximum cashout retries exceeded" });
//             }
//             if (event === 'rollback' && rollback_retries >= 10) {
//                 return res.status(400).send({ status: false, msg: "Maximum rollback retries exceeded" });
//             }
//             let [operator] = await write.query(`SELECT * FROM operator where user_id = ?`, [operator_id]);
//             if (operator.length > 0) {
//                 let secret = operator[0].secret;
//                 let operatorUrl = await getWebhookUrl(operator_id, "UPDATE_BALANCE");
//                 if (operatorUrl) {
//                     event === 'cashout' ? cashout_retries += 1 : rollback_retries += 1;
//                     let [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [txn_ref_id]);
//                     let txn_id = await generateUUIDv7();
//                     let settleAmount = event == 'cashout' ? amount : getRollbackTransaction[0].amount;
//                     let settleDescription = event == 'cashout' ? description : `${amount} Rollback-ed for transaction with reference ID ${txn_ref_id}`;
//                     let txn_type = event == 'cashout' ? 1 : 2;
//                     let webhookData = { txn_id, amount: settleAmount, txn_ref_id, description: settleDescription, txn_type, token: options.token };
//                     const requestOptions = createOptions(operatorUrl, webhookData);
//                     requestOptions.data.data = await encryption(requestOptions.data.data, secret);
//                     await write.query(`UPDATE pending_transactions SET cashout_retries = ?, rollback_retries = ? WHERE id = ?`, [cashout_retries, rollback_retries, id]);
//                     await axios(requestOptions).then(async (data) => {
//                         if (data.status == 200) {
//                             delete webhookData.token;
//                             const options = {
//                                 method: 'POST',
//                                 url: backend_base_url + '/settleBet',
//                                 headers: {
//                                     'Content-Type': 'application/json',
//                                 },
//                                 data: {
//                                     ...webhookData, userId: user_id, operatorId: operator_id, rollbackMsg: event == 'cashout' ? null : getRollbackTransaction[0].description
//                                 }
//                             };
//                             await axios(options).then(async data => {
//                                 if (data.status === 200) {
//                                     console.log(`[SUCCESS] Response from game for ${event} event is:::`, JSON.stringify(data.data));
//                                 }else{
//                                     console.log(`[Error] Response from game for ${event} event is:::`, JSON.stringify(data.data));
//                                 }
//                             }).catch(async err => {
//                                 let data = err?.response?.data
//                                 console.error(`[Error] Response from game for ${event} event is:::`, JSON.stringify(data));
//                             })

//                             if (event === "cashout") {
//                                 await write.query(`UPDATE transaction SET txn_id = ?, txn_status = '2' where id = ?`, [webhookData.txn_id, transaction_id]);
//                                 await write.query(`UPDATE pending_transactions SET event = 'cashout', txn_status = '2' where id = ?`, [id]);
//                             } else {
//                                 webhookData.txn_type = `${webhookData.txn_type}`;
//                                 await write.query(`INSERT IGNORE INTO transaction (user_id, session_token , operator_id, txn_id, amount,  txn_ref_id , description, txn_type, txn_status) VALUES (?)`, [[user_id, session_token, operator_id, ...webhookData, '2']]);
//                                 await write.query(`UPDATE transaction SET txn_status = '0' where id = ?`, [transaction_id]);
//                                 await write.query(`UPDATE pending_transactions SET event = 'rollback', txn_status = '2' where id = ?`, [id]);
//                             }
//                             return res.status(200).send({ status: true, msg: `Bet successfully settled for ${event} event`});
//                         } else {
//                             if (cashout_retries >= 10 && rollback_retries >= 10) {
//                                 await write.query(`UPDATE transaction SET txn_status = '0' where id = ?`, [transaction_id]);
//                                 await write.query(`UPDATE pending_transactions SET txn_status = '0' where id = ?`, [id]);
//                             }
//                             return res.status(400).send({ status: false, msg: `Request failed from Operator upstream server` })
//                         }
//                     }).catch(async (err) => {
//                         if (cashout_retries >= 10 && rollback_retries >= 10) {
//                             await write.query(`UPDATE transaction SET txn_status = '0' where id = ?`, [transaction_id]);
//                             await write.query(`UPDATE pending_transactions SET txn_status = '0' where id = ?`, [id]);
//                         }
//                         return res.status(400).send({ status: false, msg: `Request failed from Operator upstream server` })
//                     });
//                 } else {
//                     return res.status(400).send({ status: false, msg: "No URL configured for the event" });
//                 }
//             } else {
//                 return res.status(400).send({ status: false, msg: "Invalid Operator Requested or operator does not exist" });
//             }
//         } else {
//             return res.status(400).send({ status: false, msg: "No pending history found for the transaction id" });
//         }

//     } catch (er) {
//         console.error(er);
//         return res.status(500).send({ status: false, msg: "internal server Error", er })
//     }
// }

module.exports = { bets, operatorRollback, manualCashoutOrRollback }