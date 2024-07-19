
const { default: axios } = require("axios");
const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");


const addGame = async (req, res) => {
    try {
        const { user_type } = req.operator?.user || {};
        if (user_type !== 'admin') {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
        const { name, url } = req.body;
        if (!name || !url) {
            return res.status(400).send({ status: false, msg: "Name and URL are required" });
        }
        const sql = `INSERT IGNORE INTO games_master_list (name, url) VALUES (?, ?)`;
        await write.query(sql, [name, url]);
        return res.status(200).send({ status: true, msg: "Game added successfully to master's list" });
    } catch (err) {
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}


const findGame = async (req, res) => {
    try {
        const token = req.headers.token;
        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            console.error(`[ERR] Error parsing JSON data:`, err);
            return res.status(500).send({ status: false, msg: "Internal Server Error" });
        }
        if (!validateUser) {
            return res.status(401).send({ status: false, msg: "Session expired. Please login again." });
        }
        const { operatorId } = validateUser;
        const sql = `SELECT * FROM operator_games AS op RIGHT JOIN games_master_list AS gml ON gml.game_id = op.game_id WHERE operator_id = ?`;
        const [data] = await write.query(sql, [operatorId]);
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}



const operatorFindGame = async (req, res) => {
    try {
        const { token } = req.headers;
        const url = process.env.service_provider_url;
        const config = {
            method: 'GET',
            url: `${url}/service/operator/game`,
            headers: { token }
        };
        try {
            const response = await axios(config);
            if (response.status === 200) {
                return res.status(200).send({ status: true, msg: "Games list fetched successfully", data: response.data });
            } else {
                return res.status(response.status).send({ status: false, msg: "Failed to fetch games list", data: response.data });
            }
        } catch (err) {
            return res.status(500).json({ msg: "Internal server Error", status: false });
        }
    } catch (err) {
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}


const getGeame = async (req, res) => {
    try {
        const { url } = req.body
        const [[data]] = await read.query("select * from games_master_list where redirect_url = ?", [url])
        return res.status(200).send({ status: true, data })
    } catch (er) {
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}


module.exports = { addGame, findGame, operatorFindGame, getGeame }