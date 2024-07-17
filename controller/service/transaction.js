const { read } = require("../../db_config/db");



const getransaction = async (req, res) => {
    try {
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        const sql = `SELECT * FROM transaction limit ? offset ? `
        const [data] = await read.query(sql, [limit, offset])
        return res.status(200).send({ status: true, msg: "Find transaction", data })
    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}



const rollbacklist = async (req, res) => {
    try {
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
       
        const sql = `SELECT  * FROM pending_transactions as p inner join  transaction  as t on p.transaction_id = t.id inner join games_master_list as g on g.game_id = p.game_id where g.is_active = 1 AND p.txn_status = '1'  limit ? offset ? `;
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