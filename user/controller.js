const { Encryption } = require("../crypto/crypto");
const { read } = require("../db_config/db");
const { generateToken } = require("../jwt/jsonwebtoken");
const uploadImage = require("../middleware/uploadS3");
const { generateUserId } = require("../super_admin/operator-controller");

const addUser = async (req, res) => {
    try {
        const { name, currency, email, phone } = req.body;
        const userid = await generateUserId(name)
        const { user_id } = res.locals.auth.user
        const sql = "insert into user_profile (user_id , name , currency ,email , phone , url ,created_by) values(?, ?, ? , ?, ?, ? , ?)"
        await write.query(sql, [userid, name, currency, email, phone, url, user_id])
        // const encryptionData = await Encryption({name , id ,client_secret , user_id , currency})
        // const Token = await generateToken(encryptionData, res)
        return res.status(200).send({ status: true, msg: "user add successfully" })
    } catch (er) {
        console.error(er);
        return res.status(500).json({ msg: "Internal server Error", status: false, ERROR: er })
    }
}


const getUser = async (req, res) => {
    try {
        const sql = "SELECT * FROM user_profile where is_deleted = 1"
        const [data] = await read.query(sql)
        return res.status(200).send({ status: true, msg: "Find data", data })
    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}


const updateUser = async (req, res) => {
    try {
        const sql = "update  user_profile set ? where user_id = ?"
        const [data] = await read.query(sql, [req.body, user_id])
        if (data.affectedRows != 0) {
            return res.status(200).send({ status: true, msg: "update user" })
        } else {
            return res.status(200).send({ status: true, msg: "not pudate user" })
        }

    } catch (er) {
        console.error(er);
        res.status(500).send({ er })
    }
}



module.exports = { addUser, getUser, updateUser }