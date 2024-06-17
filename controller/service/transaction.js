const { read } = require("../../db_config/db");



const getransaction = async (req, res) => {
    try {
       
        const sql = `SELECT * FROM transaction`
        const [data] = await read.query(sql)
        return res.status(200).send({ status: true, msg: "Find transaction", data })
    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}


module.exports = {
    getransaction
}