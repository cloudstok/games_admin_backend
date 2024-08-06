const { read } = require("../../db_config/db");



const getransaction = async (req, res) => {
    try {
        let { limit = 100, offset = 0, user_id, operator_id } = req.query;
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
        if (operator_id) {
            whereConditions.push('operator_id = ?');
            params.push(operator_id);
        }

        if (whereConditions.length > 0) {
            sql += ' WHERE ' + whereConditions.join(' AND ');
        }

        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [data] = await read.query(sql, params);
        return res.status(200).send({ status: true, msg: "Find transaction", data });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send({ status: false, msg: 'Internal Server Error' });
    }
};




const rollbacklist = async (req, res) => {
    try {
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }

        const sql = `SELECT pt.id as pt_id, pt.transaction_id as pt_tr_id, pt.game_id as pt_gm_id, pt.options as pt_options, pt.cashout_retries as pt_cashout_retires, pt.rollback_retries as pt_rollback_retries, pt.event as pt_event, pt.txn_status as pt_txn_status, tn.user_id as tn_user_id, tn.session_token as tn_session_token, tn.operator_id as tn_operator_id, tn.txn_id as tn_txn_id, tn.amount as tn_amount, tn.txn_ref_id as tn_txn_ref_id, tn.description as tn_description, gml.backend_base_url, gml.image as game_image, gml.name as game_name FROM pending_transactions as pt inner join transaction as tn on tn.id = pt.transaction_id inner join games_master_list as gml on gml.game_id = pt.game_id WHERE gml.is_active = '1' AND pt.txn_status = '1'  limit ? offset ? `;
        const [data] = await read.query(sql, [limit, offset])
        return res.status(200).send({ status: true, msg: "Transactions fetched successfully", data })
    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}


module.exports = {
    getransaction,
    rollbacklist
}