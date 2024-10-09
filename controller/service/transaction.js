const { read } = require("../../utilities/db-connection");

const getransaction = async (req, res) => {
    try {
        let { limit = 100, offset = 0, user_id, operator_id, game_id } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
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
        if (whereConditions.length > 0) {
            sql += ' WHERE ' + whereConditions.join(' AND ');
        }
        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const [data] = await read(sql, params);
        return res.status(200).send({ status: true, msg: "Find transaction", data });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).send({ status: false, msg: 'Internal Server Error' });
    }
};


const rollbacklist = async (req, res) => {
    try {
        const params = [];
        let whereConditions = [];
        let { limit = 100, offset = 0, operator_id, game_id } = req.query;
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


module.exports = {
    getransaction,
    rollbacklist
}