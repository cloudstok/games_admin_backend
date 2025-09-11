const axios = require('axios');
const { write } = require('../../utilities/db-connection');
const { generateUUIDv7, getTransactionOptions, getTransactionForRollback, getLobbyFromDescription } = require('../../utilities/common_function');
const { encryption, decryption } = require('../../utilities/ecryption-decryption');
const { variableConfig } = require('../../utilities/load-config');
const createLogger = require('../../utilities/logger');
const transactionRetryLogger = createLogger('transactionRetry', 'jsonl');
const manualRollbackLogger = createLogger('manualRollback', 'jsonl');
const failedTransactionRetryLogger = createLogger('failedTransactionRetry', 'jsonl');
const failedManualRollbackLogger = createLogger('failedManualRollback', 'jsonl');

async function executeTransactionQuery(responseData, requestData) {
    try {
        if (requestData.txn_status == '0' && requestData.event == 'retry') {
            await write(`UPDATE transaction SET txn_status = '2' WHERE txn_id = ?`, [requestData.txn_id]);
            console.log(`Transaction updated`);
        } else if (requestData.event == 'rollback') {
            const { user_id, token, operatorId, txn_id, amount, txn_ref_id, description, txn_type, game_id } = responseData;
            const lobby_id = description ? getLobbyFromDescription(description) : "";
            await write("INSERT INTO transaction (user_id, game_id , session_token , operator_id, txn_id, amount, lobby_id, txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, token, operatorId, txn_id, amount, lobby_id, txn_ref_id, description, `${txn_type}`, '2']]);
            console.log(`transaction logged to db`);
        }
        return;
    } catch (err) {
        console.log(err);
    }
}

//Admin Rollback or Cashout Retry
const retryTransaction = async (req, res) => {
    try {
        const { user_id, game_id, session_token, operator_id, txn_id, amount, txn_ref_id, description, txn_type, txn_status, event } = req.body;
        let postData;
        if (event == 'rollback' && txn_type == '2') return res.status(400).send({ status: false, msg: "Rollback can't be initiated on a rollbacked transaction" });
        if (event == 'retry') postData = await getTransactionOptions({ amount, txn_id, txn_ref_id, ip: req.headers['x-forwarded-for'], game_id, user_id, operatorId: operator_id, txn_type, token: session_token, description });
        if (event == 'rollback') postData = await getTransactionForRollback({ ...req.body, ip: req.headers['x-forwarded-for'] });
        const options = postData.options;
        if (!options) return res.status(400).send({ status: false, msg: "Something went wrong while processing Transaction" });
        try {
            const response = await axios(options);
            if (response?.status == 200) {
                const logData = { req: req.body, options, res: response?.data };
                event == 'retry' ? transactionRetryLogger.info(JSON.stringify(logData)) : manualRollbackLogger.info(JSON.stringify({ ...logData, rollbackData: postData.dbData }));
                await executeTransactionQuery(postData.dbData, req.body);
                return res.status(200).send({ status: true, msg: `Transaction ${event} execution successful` })
            }
        } catch (err) {
            const logData = { req: req.body, options, res: err?.response?.status, data: err?.response?.data };
            event == 'retry' ? failedTransactionRetryLogger.error(JSON.stringify(logData)) : failedManualRollbackLogger.error(JSON.stringify({ ...logData, rollbackData: postData.dbData }));
            return res.status(400).send({ status: false, msg: "Internal Server Error" });
        }
    } catch (er) {
        console.error(er);
        return res.status(500).send({ status: false, msg: "internal server Error" });
    }
};


// Operator Rollback
const operatorRollback = async (req, res) => {
    try {
        const { token } = req.headers;
        const { data } = req.body;
        const operatorId = req.params.operatorId;
        const operator = await getOperator(operatorId);
        if (!operator) {
            return res.status(400).send({ status: false, msg: "Request initiated for Invalid Operator" });
        }
        const secret = operator.secret;
        const decodeData = await decryption(data, secret);
        const userId = decodeData.user_id;
        const txn_ref_id = decodeData.txnRefId;
        const [pendingTxn] = await getPendingTransaction(txn_ref_id);
        if (!pendingTxn) {
            return res.status(400).send({ status: false, msg: "No Pending Credits for this Transaction ID" });
        }
        const rollbackAmount = pendingTxn[0].amount;
        const transactionId = await generateUUIDv7();
        const transactionData = {
            txn_id: transactionId,
            txn_ref_id,
            amount: rollbackAmount,
            description: `${rollbackAmount} Rollback-ed for transaction with reference ID ${txn_ref_id}`,
            txn_type: 2,
            user_id: userId
        };

        await insertRollbackData(userId, token, operatorId, transactionId, rollbackAmount, txn_ref_id, transactionData.description, pendingTxn[0].game_id);
        return res.status(200).send({ status: true, msg: `Bet rollback-ed successfully for reference ID ${txn_ref_id}`, data: await encryption(transactionData, secret) });
    } catch (er) {
        console.error(er);
        let erMsg = er?.response?.data?.message;
        if (erMsg === "Transaction not found.")
            return res.status(200).send({ status: true, msg: `Bet Not found for reference ID ${txn_ref_id}`, data: await encryption(transactionData, secret) });
        return res.status(500).send({ status: false, msg: "internal server Error", er });
    }
};

const insertRollbackData = async (userId, token, operatorId, transactionId, rollbackAmount, txn_ref_id, description, game_id) => {
    const lobby_id = description ? getLobbyFromDescription(description) : "";
    await write(`INSERT IGNORE INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)`, [[userId, game_id, token, operatorId, transactionId, rollbackAmount, lobby_id, txn_ref_id, description, '2', '2']])
};

const getOperator = async (operatorId) => {
    try {
        const getOperator = (variableConfig.operator_data.find(e => e.user_id === operatorId)) || null;
        return getOperator;
    } catch (error) {
        console.error('Error fetching operator:', error);
        throw new Error('Operator fetch failed');
    }
};

const getPendingTransaction = async (txn_ref_id) => {
    try {
        const [getPendingTransaction] = await write(`SELECT * FROM transaction WHERE txn_id = ? and txn_status = '0'`, [txn_ref_id]);
        return getPendingTransaction;
    } catch (error) {
        console.error('Error fetching pending transaction:', error);
        throw new Error('Pending transaction fetch failed');
    }
};

module.exports = { operatorRollback, retryTransaction }