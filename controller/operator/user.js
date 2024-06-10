const { read, write } = require("../../db_config/db");
const axios = require('axios');
const { generateRandomUserId, generateRandomString } = require("../../utilities/common_function");
const { hashPassword, compare } = require("../../utilities/bcrypt/bcrypt");
const { encryption, decryption } = require('../../utilities/ecryption-decryption');

const addUser = async (req, res) => {
    try {
        const { id } = req.operator.user;
        const { name, currency_preference, profile_url } = req.body;
        const userId = await generateRandomUserId(name);
        const password = await generateRandomString(10);
        const hashedPassword = await hashPassword(password);
        const sql = "insert into user (operator_id, name, user_id , password , currency_prefrence) values(?, ?, ? , ?, ?)"
        await write.query(sql, [id, name, userId, hashedPassword, currency_preference]);
        return res.status(200).send({ status: true, msg: "User created successfully", data: { name, userId, password, profile_url, currency_preference } })
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}



const userLogin = async (req, res) => {
    try {
        
        const { pub_key, secret } = req.operator.user;
        const { userId, password } = req.body;
        const [getUser] = await write.query(`SELECT * FROM user WHERE user_id = ?`, [userId]);
        if (getUser.length > 0) {
            const checkPassword = await compare(password, getUser[0].password)
            if (!checkPassword) {
                return res.status(401).json({ status: false, msg: "Missing or Incorrect Credentials" });
            }
            const { user_id, name, profile_url, currency_prefrence } = getUser[0];
            const reqTime = Date.now();
            let encryptedData = await encryption({ user_id, name, profile_url, currency_prefrence, reqTime }, secret);
            const {service_provider_url} = process.env;
            console.log(service_provider_url)
            //logging into service provider
            const options = {
                method: 'POST',
                url: `${service_provider_url}/service/user/login/${encodeURIComponent(pub_key)}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                   data: encryptedData
                }
            };
            await axios(options).then(data=>{
                if(data.status === 200){
                    return res.status(200).send({ status: true, msg: "user logged in successfully", data: data.data});
                }else{
                    console.log(`received an invalid response from upstream server`);
                    return res.status(data.status).send({ status: false, msg:`Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                }
            }).catch(err=>{
                console.error(`[ERR] while getting game data from service provider is::`, JSON.stringify(err))
                return res.status(500).send({ status: false, msg: "We've encountered an internal error" });
            })

        } else {
            return res.status(400).send({ status: false, msg: "User does not exists" });
        }

    } catch (err) {
        console.error(err);
        return res.send(500).send({ status: false, msg: "Internal Server Error" });
    }
}

const getUser = async (req, res) => {
    try {
        const sql = "SELECT * FROM user where is_deleted = 0"
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



module.exports = { addUser, userLogin , getUser }