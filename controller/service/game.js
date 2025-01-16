const { default: axios } = require("axios");
const { read, write } = require("../../utilities/db-connection");
const { getRedis } = require("../../utilities/redis-connection");
const { loadConfig, variableConfig } = require("../../utilities/load-config");
const { uploadImage } = require("../../utilities/file_upload");


const getGameDetails = (req, res) => {
  try{
    const game_code = req.params.game_code;
    if(!game_code) return res.status(400).json({ status: false, msg: "Missing necassary paramters" });
    const gameDetails = variableConfig.games_masters_list.find(e=> e.game_code == game_code);
    if(!gameDetails) return res.status(400).json({ status: false, msg: "Game with game code doesn't exist"});
    return res.status(200).json({ status: true, data: gameDetails});
  } catch (err) {
    console.error("Error fetching operator games:", err);
    return res.status(500).json({ status: false, msg: "Internal server error" });
}
}

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
        const sql = ` SELECT *  FROM operator_games AS og  INNER JOIN games_master_list AS gml  ON gml.game_id = og.game_id  WHERE operator_id = ? and og.is_active = 1`;
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
        const sql = `SELECT og.game_id, gml.name, gml.game_category as category, og.is_active FROM operator_games AS og INNER JOIN games_master_list AS gml ON gml.game_id = og.game_id WHERE operator_id = ?`;
        const [gamesList] = await write(sql, [operator_id]);
        return res.status(200).send({ status: true, msg: "Games fetched successfully for operator", data: gamesList });
    } catch (err) {
        console.error("Error fetching operator games:", err);
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}


const addGameForOperator = async (req, res) => {
    try {
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
        let image = ''
        if (req.files && req.files.length > 0) {
           const data = await uploadImage(req.files)
         image =data?.Location
       }
        const { name, url, backendUrl, companyName, code, category } = req.body;
        const sql = `INSERT IGNORE INTO games_master_list (name, game_category, url , backend_base_url, company_name, game_code , image) VALUES (?,?,?,?,?,?,?)`;
        await write(sql, [name, category, url, backendUrl, companyName, code , image]);
        await loadConfig({ loadGames: true });
        return res.status(200).send({ status: true, msg: "Game added successfully to the master's list" });
    } catch (err) {
        console.error("Error adding game to master's list:", err);
        return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
}



const serviceUpdateGame = async (req, res) => {
    try {
      let image = '';
      if (req.files && req.files.length > 0) {
        const data = await uploadImage(req.files);
        image = data?.Location;
      }
  
      const { game_id, name, url, backendUrl, companyName, code, category } = req.body;
  
      if (!game_id) {
        return res.status(400).json({ status: false, msg: "Game ID is required for updating." });
      }
  
      // Build the SQL query dynamically to update only provided fields
      const fieldsToUpdate = [];
      const values = [];
  
      if (name) {
        fieldsToUpdate.push("name = ?");
        values.push(name);
      }
      if (category) {
        fieldsToUpdate.push("game_category = ?");
        values.push(category);
      }
      if (url) {
        fieldsToUpdate.push("url = ?");
        values.push(url);
      }
      if (backendUrl) {
        fieldsToUpdate.push("backend_base_url = ?");
        values.push(backendUrl);
      }
      if (companyName) {
        fieldsToUpdate.push("company_name = ?");
        values.push(companyName);
      }
      if (code) {
        fieldsToUpdate.push("game_code = ?");
        values.push(code);
      }
      if (image) {
        fieldsToUpdate.push("image = ?");
        values.push(image);
      }
  
      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ status: false, msg: "No fields provided to update." });
      }
  
      values.push(game_id);
  
      const sql = `UPDATE games_master_list SET ${fieldsToUpdate.join(", ")} WHERE game_id = ?`;
      await write(sql, values);
  
      await loadConfig({ loadGames: true });
      return res.status(200).send({ status: true, msg: "Game updated successfully in the master's list" });
    } catch (err) {
      console.error("Error updating game in master's list:", err);
      return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
    }
  };
  


const getMasterListGames = async (req, res) => {
    try {
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
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



module.exports = { serviceAddGame, getGameDetails, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator, getGameURL  , serviceUpdateGame};

