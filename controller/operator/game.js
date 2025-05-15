
const { default: axios } = require("axios");
const { read, write } = require("../../utilities/db-connection");
const { getRedis, setRedis } = require("../../utilities/redis-connection");
const { variableConfig, loadConfig } = require('../../utilities/load-config')

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
        await write(sql, [name, url]);
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
        const [data] = await write(sql, [operatorId]);
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}



const operatorFindGame = async (req, res) => {
    try {
        const { token } = req.headers;
        const genre = req.query.genre || 'general';
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
        const getCachedData = await getRedis(`OPGM:${genre}:${operatorId}`);
        if (getCachedData) {
            return res.status(200).send({ status: true, msg: 'Games list fetched successfully', data: JSON.parse(getCachedData) });
        }
        const sql = `SELECT * FROM operator_games AS og  INNER JOIN games_master_list AS gml  ON gml.game_id = og.game_id  WHERE operator_id = ? and og.is_active = 1 and gml.genre = ?`;
        const [gamesList] = await read(sql, [operatorId, genre]);
        if(genre == 'mini'){
            gamesList.map(game=> {
                game.count = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
            })
        }
        const resp = { status: true, msg: "Games fetched successfully for operator", data: gamesList };
        await setRedis(`OPGM:${operatorId}`, JSON.stringify(resp), 60);
        return res.status(200).send({ status: true, msg: 'Games list fetched successfully', data: resp });
    } catch (err) {
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}

const operatorGameCodes = async (req, res) => {
    try {
        const { token } = req.headers;
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
        const getCachedData = await getRedis(`GMCD:${operatorId}`);
        if (getCachedData) {
            return res.status(200).send({ status: true, msg: 'Games list fetched successfully', data: JSON.parse(getCachedData) });
        }
        const sql = `SELECT game_code FROM operator_games AS og  INNER JOIN games_master_list AS gml  ON gml.game_id = og.game_id  WHERE operator_id = ? and og.is_active = 1`;
        const [gamesList] = await read(sql, [operatorId]);
        const finalData = gamesList.map(e=> e.game_code);
        await setRedis(`OPGM:${operatorId}`, JSON.stringify(finalData), 60);
        return res.status(200).send({ status: true, msg: 'Games list fetched successfully', data: finalData });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}

const operatorGameByOperatorId = async (req, res) => {
    try {
        const operatorId = req.params.operator_id;
        const getCachedData = await getRedis(`OPGMID:${operatorId}`);
        if (getCachedData) {
            return res.status(200).send({ status: true, msg: 'Games list fetched successfully', data: JSON.parse(getCachedData) });
        }
        const sql = `SELECT * FROM operator_games AS og  INNER JOIN games_master_list AS gml  ON gml.game_id = og.game_id  WHERE operator_id = ? and og.is_active = 1`;
        const [gamesList] = await read(sql, [operatorId]);
        await setRedis(`OPGM:${operatorId}`, JSON.stringify(gamesList), 60);
        return res.status(200).send({ status: true, msg: 'Games list fetched successfully', data: gamesList });
    } catch (err) {
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}



const getGeame = async (req, res) => {
    try {
        const { url } = req.body
        const [[data]] = await read("select * from games_master_list where redirect_url = ?", [url])
        return res.status(200).send({ status: true, data })
    } catch (er) {
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}


const addGeameWebhook = async (req, res) => {
    try {
        const { game_id, event, url } = req.body;

        if (!game_id || !event || !url) {
            return res.status(400).json({ status: false, msg: "Missing required fields" });
        }

        // Insert the data into the database
        const [result] = await write(
            "INSERT INTO game_webhook_config (game_id, url, event) VALUES (?, ?, ?)",
            [game_id, url, event]
        );
        await loadConfig({ loadgame_webhook: true })
        return res.status(200).send({
            status: true,
            msg: "webhook add successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal Server Error", status: false });
    }
};


const update_webhook = async (req, res) => {
    try {
        const { id, game_id, url, event, is_deleted } = req.body;
        if (!id) {
            return res.status(400).send({ status: false, msg: "Webhook ID is required for updating" });
        }
        const fieldsToUpdate = [];
        const values = [];
        if (game_id) {
            fieldsToUpdate.push("game_id = ?");
            values.push(game_id);
        }
        if (url) {
            fieldsToUpdate.push("url = ?");
            values.push(url);
        }
        if (event) {
            fieldsToUpdate.push("event = ?");
            values.push(event);
        }
        if (parseInt(is_deleted) == 0 || parseInt(is_deleted) == 1) {
            const newStatus = is_deleted ? 0 : 1;
            fieldsToUpdate.push("is_deleted = ?");
            values.push(newStatus);
        }
        if (fieldsToUpdate.length === 0) {
            return res.status(400).send({ status: false, msg: "No fields provided to update" });
        }
        values.push(id);
        const sql = `UPDATE game_webhook_config SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
        await write(sql, values);
        await loadConfig({ loadgame_webhook: true });
        return res.status(200).send({ status: true, msg: "Webhook updated successfully" });
    } catch (err) {
        console.error("Error updating webhook:", err);
        return res.status(500).send({ status: false, msg: "Internal server error", error: err.message });
    }
};


const getGeameWebhook = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || null;
        const offset = parseInt(req.query.offset) || 0;
        const game_id = req.query.game_id ? parseInt(req.query.game_id) : null;
        const event = req.query.event || null;

        const updatedGameWebhookEvents = variableConfig.game_webhook_event.map(e => {
            const gameMaster = variableConfig.games_masters_list.find(el => el.game_id.toString().toLowerCase() === e.game_id.toString().toLowerCase());
            const name = gameMaster ? gameMaster.name : null;
            return { ...e, name };
        });

        let filteredData = updatedGameWebhookEvents;

        if (game_id) {
            filteredData = filteredData.filter(e => e.game_id === game_id);
        }
        if (event) {
            filteredData = filteredData.filter(e => (e.event.toLowerCase() === event.toLowerCase()) && !e.is_deleted);
        }

        const paginatedData = limit
            ? filteredData.slice(offset, offset + limit)
            : filteredData;

        return res.status(200).send({
            status: true,
            data: paginatedData,
            total: filteredData.length,
            limit: limit || filteredData.length,
            offset,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal Server Error", status: false });
    }
};



module.exports = { addGame, findGame, operatorFindGame, getGeame, getGeameWebhook, addGeameWebhook, update_webhook, operatorGameByOperatorId, operatorGameCodes }