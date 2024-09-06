const { default: axios } = require("axios");
const { read, write } = require("../../utilities/db-connection");
const { getRedis } = require("../../utilities/redis-connection");


const getOperatorGame = async (req, res) => {
    try {
        const token = req.headers.token;
        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            console.error("Error parsing Redis token:", err);
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
        }
        if (!validateUser) {
            return res.status(401).send({ status: false, msg: "Token expired or request timed out" });
        }
        const { operatorId } = validateUser;
        const sql = ` SELECT *  FROM operator_games AS og  INNER JOIN games_master_list AS gml  ON gml.game_id = og.game_id  WHERE operator_id = ? `;
        const [gamesList] = await write(sql, [operatorId]);
        return res.status(200).send({ status: true, msg: "Games fetched successfully for operator", data: gamesList });
    } catch (err) {
        console.error("Error fetching operator games:", err);
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}


const getOperatorGamesForService = async (req, res) => {
    try {
        const userType = req.operator?.user?.user_type;
        if (userType !== 'admin') {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
        const { operator_id } = req.params;
        const sql = `SELECT * FROM operator_games AS og INNER JOIN games_master_list AS gml ON gml.game_id = og.game_id WHERE operator_id = ? `;
        const [gamesList] = await write(sql, [operator_id]);
        return res.status(200).send({ status: true, msg: "Games fetched successfully for operator", data: gamesList });
    } catch (err) {
        console.error("Error fetching operator games:", err);
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}


const addGameForOperator = async (req, res) => {
    try {
        if (req.operator?.user?.user_type !== 'admin') {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
        const { operator_id, game_id } = req.body;
        const sql = `INSERT IGNORE INTO operator_games (game_id, operator_id) VALUES (?, ?)`;
        await write(sql, [game_id, operator_id]);
        return res.status(200).send({ status: true, msg: "Game assigned successfully to operator" });
    } catch (err) {
        console.error("Error assigning game to operator:", err);
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}


const serviceAddGame = async (req, res) => {
    try {
        if (req.operator?.user?.user_type !== 'admin') {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
        const { name, url , backendurl } = req.body;
        const sql = `INSERT IGNORE INTO games_master_list (name, url , backend_base_url) VALUES (?, ? , ?)`;
        await write(sql, [name, url , backendurl]);
        return res.status(200).send({ status: true, msg: "Game added successfully to the master's list" });
    } catch (err) {
        console.error("Error adding game to master's list:", err);
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}


const getMasterListGames = async (req, res) => {
    try {
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        if (req.operator?.user?.user_type !== 'admin') {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
        const sql = `SELECT * FROM games_master_list WHERE is_active = 1 LIMIT ? OFFSET ?`;
        const [gamesList] = await write(sql, [limit, offset]);
        return res.status(200).send({ status: true, msg: "Games list fetched successfully", gamesList });
    } catch (err) {
        console.error("Error fetching games list:", err);
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}



const getGameURL = async (req, res) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.status(400).json({ msg: "Token is missing", status: false });
        }
        const redisData = await getRedis(token);
        if (!redisData) {
            return res.status(404).json({ msg: "URL not found", status: false });
        }
        const { url } = JSON.parse(redisData);
        return res.status(200).send({ status: true, msg: "Find Game URL", url });
    } catch (err) {
        console.log(err);
        if (err instanceof SyntaxError) {
            return res.status(400).json({ msg: "Invalid data format", status: false });
        }
        return res.status(500).json({ msg: "Internal server error", status: false });
    }
};



module.exports = { serviceAddGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator, getGameURL };

