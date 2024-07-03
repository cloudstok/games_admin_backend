const { read } = require("../../db_config/db");



const getransaction = async (req, res) => {
    try {
        let { limit, offset } = req.query
        if (!(limit && offset)) {
            limit = 100
            offset = 0
        }
        const sql = `SELECT * FROM transaction limit ? offset ? `
        const [data] = await read.query(sql, [+limit, +offset])
        return res.status(200).send({ status: true, msg: "Find transaction", data })
    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}



const rollbacklist = async (req, res) => {
    try {
        let { limit, offset } = req.query
       
        const sql = `SELECT  p.id , p.transaction_id ,p.backend_base_url , p.retry , p.status , t.user_id , t.operator_id , t.amount FROM pending_transactions as p inner join  transaction  as t on p.transaction_id = t.id  limit ? offset ? `
        const [data] = await read.query(sql, [+limit, +offset])
        return res.status(200).send({ status: true, msg: "Find transaction", data })
    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}


module.exports = {
    getransaction,
    rollbacklist
}