
const { default: axios } = require("axios");
const { read, write } = require("../../utilities/db-connection");
const { getRedis } = require("../../utilities/redis-connection");
const {variableConfig, loadConfig} = require('../../utilities/load-config')

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
        const [result] = await read(
            "INSERT INTO game_webhook_config (game_id, url, event) VALUES (?, ?, ?)",
            [game_id, url, event]
        );
        await  loadConfig({loadgame_webhook : true})
        return res.status(200).send({ 
            status: true, 
           msg  :  "webhook add successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal Server Error", status: false });
    }
};


const update_webhook = async (req, res) => {
    try {
      const { id, user_id, url, event , is_deleted } = req.body;
      if (!id) {
        return res.status(400).send({ status: false, msg: "Webhook ID is required for updating" });
      }
      const fieldsToUpdate = [];
      const values = [];
      if (user_id) {
        fieldsToUpdate.push("user_id = ?");
        values.push(user_id);
      }
      if (url) {
        fieldsToUpdate.push("webhook_url = ?");
        values.push(url);
      }
      if (event) {
        fieldsToUpdate.push("event = ?");
        values.push(event);
      }
      if (parseInt(is_deleted) == 0  || parseInt(is_deleted) == 1) {
        const newStatus = is_deleted ? 0 : 1;
        fieldsToUpdate.push("is_deleted = ?");
        values.push(newStatus);
      }
      if (fieldsToUpdate.length === 0) {
        return res.status(400).send({ status: false, msg: "No fields provided to update" });
      }
      values.push(id);
      const sql = `UPDATE game_webhook_config SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
      console.log({sql})
      await write(sql, values);
      await loadConfig({ loadgame_webhook: true });
      return res.status(200).send({ status: true, msg: "Webhook updated successfully" });
    } catch (err) {
      console.error("Error updating webhook:", err);
      return res.status(500).send({ status: false, msg: "Internal server error", error: err.message });
    }
  };
  

// const getGeameWebhook = async (req, res) => {
//     try {
    
//         const updatedGameWebhookEvents = variableConfig.game_webhook_event.map(e => {
//             const gameMaster = variableConfig.games_masters_list.find(el => el.game_id === e.game_id);
//             const name = gameMaster ? gameMaster.name : null; // Handle cases where gameMaster is not found
//             return { ...e, name }; // Add the name to the current event object
//         });

//         return res.status(200).send({
//             status: true,
//             data:  updatedGameWebhookEvents
//         });
//     } catch (err) {
//         console.error(err); // Use error for better context
//         return res.status(500).json({ msg: "Internal Server Error", status: false });
//     }
// };


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
            filteredData = filteredData.filter(e =>( e.event.toLowerCase() === event.toLowerCase()) && !e.is_deleted );
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



module.exports = { addGame, findGame, operatorFindGame, getGeame , getGeameWebhook , addGeameWebhook   , update_webhook}