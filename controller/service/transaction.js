const { read } = require("../../utilities/db-connection");
const { variableConfig } = require("../../utilities/load-config");

const getransaction = async (req, res) => {
    try {
        let { limit = 100, offset = 0,txn_status ,  user_id, operator_id, game_id , txn_id, txn_ref_id, lobby_id, type, start_date, end_date} = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        if((start_date && !end_date) || (!start_date && end_date)) return res.status(400).send({ status: false, msg: 'Both Start and End time is required to invoke date filter'});

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

        if(start_date && end_date) {
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
        const finalData = data.map(e=> {
            e.game_name = (variableConfig.games_masters_list.find(game=> game.game_id == e.game_id))?.name || '';
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
        let { limit = 100, offset = 0, operator_id, game_id   , transaction_id} = req.query;
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
        console.log({user_id , operator_id})
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




module.exports = {
    getransaction,
    rollbacklist,
    getransactionbyuser
}