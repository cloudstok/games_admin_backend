const { default: axios } = require("axios");
const { getWebhookUrl, generateUUIDv7, getLobbyFromDescription } = require("../../utilities/common_function");
const { read, write } = require("../../utilities/db-connection");
const { encryption } = require("../../utilities/ecryption-decryption");
const { variableConfig } = require("../../utilities/load-config");
const logger = require('../../utilities/logger');
const thirdPartyLogger = logger('Void_Bets', 'jsonl');
const failedThirdPartyLogger = logger('Failed_Void_Bets', 'jsonl');


const getransaction = async (req, res) => {
    try {
        let { limit = 100, offset = 0, txn_status, user_id, operator_id, game_id, txn_id, txn_ref_id, lobby_id, type, start_date, end_date } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        if ((start_date && !end_date) || (!start_date && end_date)) return res.status(400).send({ status: false, msg: 'Both Start and End time is required to invoke date filter' });

        let sql = 'SELECT * FROM transaction';
        const params = [];
        let whereConditions = [];
        if (user_id) {
            whereConditions.push('user_id = ?');
            params.push(user_id);
        }
        if (game_id) {
            whereConditions.push('game_id = ?');
            params.push(game_id);
        }
        if (operator_id) {
            whereConditions.push('operator_id = ?');
            params.push(operator_id);
        }

        if (txn_id) {
            whereConditions.push('txn_id = ?');
            params.push(txn_id);
        }

        if (txn_ref_id) {
            whereConditions.push('txn_ref_id = ?');
            params.push(txn_ref_id);
        }

        if (lobby_id) {
            whereConditions.push('lobby_id = ?');
            params.push(lobby_id);
        }

        if (type) {
            whereConditions.push('txn_type = ?');
            params.push(type);
        }
        if (txn_status) {
            whereConditions.push('txn_status = ?');
            params.push(txn_status);
        }

        if (start_date && end_date) {
            start_date = new Date(start_date).toISOString().slice(0, -5).replace('T', ' ');
            end_date = new Date(end_date).toISOString().slice(0, -5).replace('T', ' ');
            whereConditions.push(`created_at >= ? AND created_at <= ?`);
            params.push(start_date, end_date)
        };

        if (whereConditions.length > 0) {
            sql += ' WHERE ' + whereConditions.join(' AND ');
        }
        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const [data] = await read(sql, params);
        const finalData = data.map(e => {
            e.game_name = (variableConfig.games_masters_list.find(game => game.game_id == e.game_id))?.name || '';
            return e;
        });
        return res.status(200).send({ status: true, msg: "Find transaction", data: finalData });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).send({ status: false, msg: 'Internal Server Error' });
    }
};


const rollbacklist = async (req, res) => {
    try {
        const params = [];
        let whereConditions = [];
        let { limit = 100, offset = 0, operator_id, game_id, transaction_id } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        if (game_id) {
            whereConditions.push('pt.game_id = ?');
            params.push(game_id);
        }
        if (operator_id) {
            whereConditions.push('tn.operator_id = ?');
            params.push(operator_id);
        }
        if (transaction_id) {
            whereConditions.push('tn.transaction_id = ?');
            params.push(transaction_id);
        }
        let whereClause = '';
        if (whereConditions.length > 0) {
            whereClause = `AND ${whereConditions.join(' AND ')}`;
        }
        const sql = ` SELECT pt.id AS pt_id, pt.transaction_id AS pt_tr_id, pt.game_id AS pt_gm_id, pt.options AS pt_options, pt.cashout_retries AS pt_cashout_retires, pt.rollback_retries AS pt_rollback_retries, pt.event AS pt_event, pt.txn_status AS pt_txn_status, tn.user_id AS tn_user_id, tn.session_token AS tn_session_token, tn.operator_id AS tn_operator_id, tn.txn_id AS tn_txn_id, tn.amount AS tn_amount, tn.txn_ref_id AS tn_txn_ref_id, tn.description AS tn_description, gml.backend_base_url, gml.image AS game_image, gml.name AS game_name 
            FROM 
                pending_transactions AS pt 
            INNER JOIN 
                transaction AS tn ON tn.id = pt.transaction_id 
            INNER JOIN 
                games_master_list AS gml ON gml.game_id = pt.game_id 
            WHERE 
                gml.is_active = '1' 
                AND pt.txn_status = '1' 
                ${whereClause} 
            LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const [data] = await read(sql, params);
        return res.status(200).send({ status: true, msg: "Transactions fetched successfully", data });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ status: false, msg: "Error fetching transactions", error: err.message });
    }
};


const getransactionbyuser = async (req, res) => {
    try {
        let { limit = 30, offset = 0, user_id, operator_id } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        if (!user_id || !operator_id) {
            return res.status(400).send({ status: false, msg: "user_id and operator_id are required" });
        }
        console.log({ user_id, operator_id })
        //let sql = 'SELECT * FROM transaction where user_id = ? and operator_id = ? limit 10';
        let sql = 'SELECT id,user_id,game_id,operator_id,txn_id,amount,lobby_id,txn_ref_id,description,txn_type,created_at FROM transaction WHERE user_id = ? AND operator_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const params = [user_id, operator_id, limit, offset];
        const [data] = await read(sql, params);
        const finalData = data.map(e => {
            e.game_name = (variableConfig.games_masters_list.find(game => game.game_id == e.game_id))?.name || '';
            return e;
        });

        return res.status(200).send({ status: true, msg: "Find transaction", data: finalData });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).send({ status: false, msg: 'Internal Server Error' });
    }
};

const voidBet = async (req, res) => {
    try {
        const txnRefId = req.body.ref_id;
        const logDataReq = { txnRefId };
        if (!txnRefId) return res.status(400).send({ status: false, msg: 'Invalid necassary paramters' });
        const [[creditTxn]] = await read(`SELECT * FROM transaction WHERE txn_ref_id = ?`, [txnRefId]);
        if (!creditTxn) return res.status(400).send({ status: false, msg: 'Transaction not found' });
        Object.assign(logDataReq, { ...creditTxn });
        if (creditTxn.txn_status != '2') return res.status(400).send({ status: false, msg: 'Credit transaction failed initally' });
        let { user_id, operator_id, session_token, game_id, lobby_id } = creditTxn;
        const [[existingVoidTrax]] = await read(`SELECT * FROM transaction WHERE txn_ref_id = ?`, [creditTxn.txn_id]);
        if (existingVoidTrax && existingVoidTrax.txn_status == '2') return res.status(400).send({ status: false, msg: "Bet already voided for the given txn" });
        const [[debitTxn]] = await read(`SELECT * FROM transaction WHERE txn_id = ?`, [txnRefId]);
        if (!debitTxn) return res.status(400).send({ status: false, msg: 'Debit transaction not found for this Ref Id' });
        if (debitTxn.txn_status != '2') return res.status(400).send({ status: false, msg: 'Debit Transaction was failed for this Ref Id' });
        const debitAmount = Number(creditTxn.amount - debitTxn.amount).toFixed(2);
        if (Number(debitAmount) <= 0) return res.status(400).send({ status: false, msg: 'Credit amount is less than Debit Amount' });

        let gameData = (variableConfig.games_masters_list.find(e => e.game_id == game_id)) || null;
        if (!gameData || !gameData.game_code) {
            return res.status(400).send({ status: false, msg: "No game code is available for the game" });
        };

        const description = `${debitAmount} debited for voiding ${gameData.name.toLowerCase()} game bet with reference id ${creditTxn.txn_id}`;
        const operatorData = variableConfig.operator_data.find(e => e.user_id == operator_id);

        if (!operatorData) return res.status(400).send({ status: false, msg: `Operator not found for this transaction` })

        try {
            operatorUrl = await getWebhookUrl(operator_id, "UPDATE_BALANCE");
        } catch (err) {
            return res.status(500).send({ status: false, msg: "Internal Server error" });
        }

        if (!operatorUrl) {
            return res.status(400).send({ status: false, msg: "No URL configured for the event" });
        }

        const betData = {
            amount: debitAmount,
            txn_id: await generateUUIDv7(),
            description,
            txn_type: 3,
            ip: '',
            txn_ref_id: creditTxn.txn_id,
            game_id: game_id,
            user_id: user_id,
            game_code: gameData.game_code
        };

        try {
            encryptedData = await encryption(betData, operatorData.secret);
        } catch (err) {
            return res.status(500).send({ status: false, msg: "Internal Server error" });
        }

        const options = {
            method: 'POST',
            url: operatorUrl,
            headers: {
                'Content-Type': 'application/json',
                token: session_token,
                'x-user-id': user_id
            },
            timeout: 1000 * 3,
            data: { data: encryptedData }
        };

        Object.assign(logDataReq, { options, betData });

        try {
            const response = await axios(options);
            //Inserting Success queries to Database
            thirdPartyLogger.info(JSON.stringify({ req: logDataReq, res: response?.data }));
            if (!existingVoidTrax) await write("INSERT INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, session_token, operator_id, betData.txn_id, debitAmount, lobby_id, betData.txn_ref_id, description, '0', '2']]);
            else await write(`UPDATE transaction SET txn_status = '2' WHERE id = ?`, [existingVoidTrax.id]);
            return res.status(200).send({ status: true, msg: 'Bet Voided successfully' });
        } catch (err) {
            const objForErr = {
                req: logDataReq,
                res4: JSON.parse(JSON.stringify(err?.response?.data || {})),
                statusCode: "" + err?.response?.status + " " + err?.code,
                message: err.message || "Unkown Error",
                stack: err.stack
            }
            failedThirdPartyLogger.error(JSON.stringify(objForErr));
            if (!existingVoidTrax) await write("INSERT INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, session_token, operator_id, betData.txn_id, debitAmount, lobby_id, betData.txn_ref_id, description, '0', '0']]);
            return res.status(500).send({ status: false, msg: err?.response?.data?.message || "Operator Denied Void Request" });
        }

    } catch (err) {
        console.error(`Error:::`, err);
        return res.status(500).send({ status: false, msg: 'Internal Server Error' });
    }
}

const rollbackBet = async (req, res) => {
    try {
        const txnId = req.params.txn_id;
        const logDataReq = { txnId };
        if (!txnId) return res.status(400).send({ status: false, msg: 'Invalid necassary paramters' });
        const [[debitTxn]] = await read(`SELECT * FROM transaction WHERE txn_id = ?`, [txnId]);
        if (!debitTxn) return res.status(400).send({ status: false, msg: 'Transaction not found' });
        Object.assign(logDataReq, { ...debitTxn });
        if (debitTxn.txn_status != '2') return res.status(400).send({ status: false, msg: 'Debit transaction failed initally' });
        let { user_id, operator_id, session_token, game_id, lobby_id, amount, description } = debitTxn;
        const [[existingRollbackTrax]] = await read(`SELECT * FROM transaction WHERE txn_ref_id = ?`, [debitTxn.txn_id]);
        if (existingRollbackTrax && existingRollbackTrax.txn_status == '2') return res.status(400).send({ status: false, msg: "Bet already rollback-ed for the given txn" });

        let gameData = (variableConfig.games_masters_list.find(e => e.game_id == game_id)) || null;
        if (!gameData || !gameData.game_code) {
            return res.status(400).send({ status: false, msg: "No game code is available for the game" });
        };

        const rollbackDescription = description.replace('debited', 'rollback-ed');
        const operatorData = variableConfig.operator_data.find(e => e.user_id == operator_id);

        if (!operatorData) return res.status(400).send({ status: false, msg: `Operator not found for this transaction` })

        try {
            operatorUrl = await getWebhookUrl(operator_id, "UPDATE_BALANCE");
        } catch (err) {
            return res.status(500).send({ status: false, msg: "Internal Server error" });
        }

        if (!operatorUrl) {
            return res.status(400).send({ status: false, msg: "No URL configured for the event" });
        }

        const betData = {
            amount,
            txn_id: await generateUUIDv7(),
            description: rollbackDescription,
            txn_type: 2,
            ip: '',
            txn_ref_id: debitTxn.txn_id,
            game_id: game_id,
            user_id: user_id,
            game_code: gameData.game_code
        };

        try {
            encryptedData = await encryption(betData, operatorData.secret);
        } catch (err) {
            return res.status(500).send({ status: false, msg: "Internal Server error" });
        }

        const options = {
            method: 'POST',
            url: operatorUrl,
            headers: {
                'Content-Type': 'application/json',
                token: session_token,
                'x-user-id': user_id
            },
            timeout: 1000 * 3,
            data: { data: encryptedData }
        };

        Object.assign(logDataReq, { options, betData });

        try {
            const response = await axios(options);
            //Inserting Success queries to Database
            thirdPartyLogger.info(JSON.stringify({ req: logDataReq, res: response?.data }));
            await write("INSERT IGNORE INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, session_token, operator_id, betData.txn_id, amount, lobby_id, debitTxn.txn_id, description, '2', '2']]);
            return res.status(200).send({ status: true, msg: 'Bet rollback-ed successfully' });
        } catch (err) {
            const objForErr = {
                req: logDataReq,
                res4: JSON.parse(JSON.stringify(err?.response?.data || {})),
                statusCode: "" + err?.response?.status + " " + err?.code,
                message: err.message || "Unkown Error",
                stack: err.stack
            }
            failedThirdPartyLogger.error(JSON.stringify(objForErr));
            await write("INSERT IGNORE INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, session_token, operator_id, betData.txn_id, amount, lobby_id, debitTxn.txn_id, description, '2', '0']]);
            return res.status(500).send({ status: false, msg: err?.response?.data?.message || "Operator Denied Void Request" });
        }

    } catch (err) {
        console.error(`Error:::`, err);
        return res.status(500).send({ status: false, msg: 'Internal Server Error' });
    }
}

const pndgTxnRetry = async (req, res) => {
    try {
        const { amount, txn_ref_id, ip, game_id, user_id, operatorId, token, description, txn_type } = req.body;
        const txn_id = await generateUUIDv7();
        const lobby_id = description ? getLobbyFromDescription(description) : "";
        const game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;

        if (!game_code) return res.status(400).send({ status: false, msg: `game code not found` });


        const operatorData = variableConfig.operator_data.find(e => e.user_id == operatorId);
        if (!operatorData) return res.status(400).send({ status: false, msg: `Operator not found for this transaction` });

        let encryptedData;

        try {
            encryptedData = await encryption({ amount, txn_id, txn_ref_id, description, txn_type, ip, game_id, user_id, game_code }, operatorData.secret);
        } catch (err) {
            return res.status(400).send({ status: false, msg: `Something went wrong!` });
        }

        let operatorUrl;

        try {
            operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
        } catch (err) {
            return res.status(400).send({ status: false, msg: `Something went wrong!` });
        }

        if (!operatorUrl) {
            return res.status(400).send({ status: false, msg: `Operator url not found` });
        }

        const postOptions = {
            method: 'POST',
            url: operatorUrl,
            headers: {
                'Content-Type': 'application/json',
                token,
                'x-user-id': user_id
            },
            timeout: 1000 * 10,
            data: { data: encryptedData }
        };
        try {
            await axios(postOptions);
            await write("INSERT IGNORE INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, token, operatorId, txn_id, amount, lobby_id, txn_ref_id, description, `${txn_type}`, '2']]);
            return res.status(200).send({ status: true, msg: 'Credit transaction successful' });
        } catch (err) {
            await write("INSERT IGNORE INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id, description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, token, operatorId, txn_id, amount, lobby_id, txn_ref_id, description, `${txn_type}`, '0']]);
            return res.status(500).send({ status: false, msg: err?.response?.data?.message || "Internal Server error", options: { amount, txn_id, txn_ref_id, description, txn_type, ip, game_id, user_id, game_code } });
        }
    } catch (err) {
        console.error(`Error:::`, err);
        return res.status(500).send({ status: false, msg: 'Internal Server Error' });
    }
}

module.exports = {
    getransaction,
    rollbacklist,
    getransactionbyuser,
    voidBet,
    pndgTxnRetry,
    rollbackBet
}