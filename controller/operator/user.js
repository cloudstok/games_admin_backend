const { read, write } = require("../../db_config/db");

const addUser = async (req, res) => {
    try {
        const { name, currency_preference, profile_url } = req.body;
        const {userId, password}= generateRandomString(name, 10);
        const sql = "insert into user (name, user_id , password , profile_url, currency_prefrence) values(?, ?, ? , ?, ?)"
        await write.query(sql, [name, userId, password, profile_url,  currency_preference]);
        return res.status(200).send({ status: true, msg: "User created successfully", data: {name, userId, password, profile_url,  currency_preference} })
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

function generateRandomString(name, length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return {password,  userId: `${name}_${Math.round(Math.random() * 10000)}`};
  }
  

// const getUser = async (req, res) => {
//     try {
//         const sql = "SELECT * FROM user_profile where is_deleted = 1"
//         const [data] = await read.query(sql)
//         return res.status(200).send({ status: true, msg: "Find data", data })
//     } catch (er) {
//         console.error(er);
//         res.status(500).send({ er })
//     }
// }


// const updateUser = async (req, res) => {
//     try {
//         const sql = "update  user_profile set ? where user_id = ?"
//         const [data] = await read.query(sql, [req.body, user_id])
//         if (data.affectedRows != 0) {
//             return res.status(200).send({ status: true, msg: "update user" })
//         } else {
//             return res.status(200).send({ status: true, msg: "not pudate user" })
//         }

//     } catch (er) {
//         console.error(er);
//         res.status(500).send({ er })
//     }
// }



module.exports = { addUser }