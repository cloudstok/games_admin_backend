const { read } = require("../../db_config/db");



const getransaction = async (req, res) => {
    try {
       const {limit , offset} = req.query
        const sql = `SELECT * FROM transaction limit ? offset ? `
        const [data] = await read.query(sql , [+limit , +offset])
        return res.status(200).send({ status: true, msg: "Find transaction", data })
    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}


module.exports = {
    getransaction
}