const { read, write } = require("../../db_config/db");
const axios = require('axios');
const { generateRandomUserId, generateRandomString } = require("../../utilities/common_function");
const { hashPassword, compare } = require("../../utilities/bcrypt/bcrypt");
const { encryption, decryption } = require('../../utilities/ecryption-decryption');
const jwt = require('jsonwebtoken');
const { getRedis } = require("../../redis/connection");

const addUser = async (req, res) => {
    try {
        const { id } = req.operator.user;
        const { name, currency_preference, profile_url } = req.body;

        const [userId, password] = await Promise.all([
            generateRandomUserId(name),
            generateRandomString(10)
        ]);

        const hashedPassword = await hashPassword(password);

        const sql = "INSERT IGNORE INTO user (operator_id, name, user_id, password, currency_prefrence) VALUES (?, ?, ?, ?, ?)";
        await write.query(sql, [id, name, userId, hashedPassword, currency_preference]);

        return res.status(200).send({ 
            status: true, 
            msg: "User created successfully", 
            data: { name, userId, password, profile_url, currency_preference } 
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal server error", status: false });
    }
}



const getOperatorCredentials = async () => {
    const [operator] = await write.query(`
        SELECT pub_key, secret 
        FROM operator 
        WHERE user_type = 'operator' 
          AND is_deleted = 0 
        LIMIT 1
    `);
    return operator[0];
};

const getUserDetails = async (userId) => {
    const [user] = await write.query(`
        SELECT * 
        FROM user 
        WHERE user_id = ?
    `, [userId]);
    return user[0];
};

const validatePassword = async (inputPassword, storedPassword) => {
    return await compare(inputPassword, storedPassword);
};

const encryptUserData = async (userData, secret) => {
    return await encryption(userData, secret);
};

const loginToServiceProvider = async (pubKey, encryptedData) => {
    const options = {
        method: 'POST',
        url: `${process.env.service_provider_url}/service/user/login/${encodeURIComponent(pubKey)}`,
        headers: { 'Content-Type': 'application/json' },
        data: { data: encryptedData }
    };
    return await axios(options);
};

const userLogin = async (req, res) => {
    try {
        const { userId, password } = req.body;

        const { pub_key, secret } = await getOperatorCredentials();
        const user = await getUserDetails(userId);

        if (!user) {
            return res.status(400).send({ status: false, msg: "User does not exist" });
        }

        const isPasswordValid = await validatePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ status: false, msg: "Missing or Incorrect Credentials" });
        }

        const { user_id, name, profile_url, currency_preference } = user;
        const reqTime = Date.now();
        const encryptedData = await encryptUserData({ user_id, name, profile_url, currency_preference, reqTime }, secret);

        const response = await loginToServiceProvider(pub_key, encryptedData);

        if (response.status === 200) {
            return res.status(200).send({ ...response.data });
        } else {
            console.error(`Received an invalid response from upstream server`);
            return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
        }
    } catch (err) {
        if (err.response) {
            const { data, status } = err.response;
            return res.status(status).send({ ...data, code: status });
        }
        console.error(err);
        return res.status(500).send({ status: false, msg: "Internal Server Error" });
    }
}


const getUser = async (req, res) => {
    try {
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader) {
            return res.status(401).send({ status: false, msg: "Authorization header missing" });
        }
        const token = tokenHeader.split(" ")[1];
        if (!token) {
            return res.status(401).send({ status: false, msg: "Token missing" });
        }
        let verifiedToken;
        try {
            verifiedToken = jwt.verify(token, process.env.jwtSecretKey);
        } catch (err) {
            return res.status(401).send({ status: false, msg: "Invalid or expired token" });
        }
        const sql = `SELECT * FROM user WHERE operator_id = ? AND is_deleted = 0 LIMIT ? OFFSET ?`;
        const [data] = await read.query(sql, [verifiedToken.user.id, limit, offset]);
        return res.status(200).send({ status: true, msg: "Data retrieved successfully", data });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ status: false, msg: "Internal Server Error" });
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



const getuserDetail = async (req, res) => {
    try {
        const token = req.headers.token;
console.log({token})
        if (!token) {
            return res.status(400).send({ status: false, msg: "Token is missing" });
        }

        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            return res.status(400).send({ status: false, msg: "Invalid token data" });
        }

        const { userId, operatorId } = validateUser;

        const sql = `
            SELECT u.name, u.user_id, w.balance, u.profile_url AS avatar 
            FROM games_admin.user AS u 
            INNER JOIN user_wallet AS w ON u.user_id = w.user_id 
            WHERE u.user_id = ?
        `;
        const [[user]] = await read.query(sql, [userId]);

        if (!user) {
            return res.status(404).send({ status: false, msg: "User not found" });
        }

        return res.status(200).send({ status: true, msg: "User details retrieved successfully", user: { ...user, operatorId } });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal Server Error", status: false });
    }
}


module.exports = { addUser, userLogin, getUser, getuserDetail }