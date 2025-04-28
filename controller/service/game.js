const { default: axios } = require("axios");
const { read, write } = require("../../utilities/db-connection");
const { getRedis } = require("../../utilities/redis-connection");
const { loadConfig, variableConfig } = require("../../utilities/load-config");
const { uploadImage } = require("../../utilities/file_upload");
const { restartQueues, validateSlug } = require("../../utilities/common_function");


const getGameDetails = (req, res) => {
  try {
    const game_code = req.params.game_code;
    if (!game_code) return res.status(400).json({ status: false, msg: "Missing necassary paramters" });
    const gameDetails = variableConfig.games_masters_list.find(e => e.game_code == game_code);
    if (!gameDetails) return res.status(400).json({ status: false, msg: "Game with game code doesn't exist" });
    return res.status(200).json({ status: true, data: gameDetails });
  } catch (err) {
    console.error("Error fetching operator games:", err);
    return res.status(500).json({ status: false, msg: "Internal server error" });
  }
}

const refreshGameCache = async(req, res) => {
  try{
    await loadConfig({ loadGames: true});
    restartQueues();
    return res.status(200).send({ status: true, msg: 'Cache refresh done'});
  } catch (err) {
    console.error("Error refreshing cache is:", err);
    return res.status(500).json({ status: false, msg: "Internal server error" });
  }
}

const getAllGameDetails = (req, res) => {
  try {
    const gameDetails = variableConfig.games_masters_list;
    if (!gameDetails) return res.status(400).json({ status: false, msg: "Games list doesn't exist" });
    return res.status(200).json({ status: true, data: gameDetails });
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
    const sql = ` SELECT * FROM operator_games AS og  INNER JOIN games_master_list AS gml  ON gml.game_id = og.game_id  WHERE operator_id = ? and og.is_active = 1`;
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
    if (!operator_id || !game_id) {
      return res.status(400).json({ status: false, msg: "operator_id and game_id are required" });
    }
    const [opGame] = await read("SELECT * FROM operator_games WHERE game_id = ? AND operator_id = ?", [game_id, operator_id]);
    if (!opGame || opGame.length === 0) {
      const sql = `INSERT IGNORE INTO operator_games (game_id, operator_id) VALUES (?, ?)`;
      await write(sql, [game_id, operator_id]);
      return res.status(200).json({ status: true, msg: "Game assigned successfully to operator" });
    } else {
      return res.status(400).json({ status: false, msg: "Game is already assigned to this operator" });
    }
  } catch (err) {
    console.error("Error assigning game to operator:", err);
    return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
  }
};



const serviceAddGame = async (req, res) => {
  try {
    let image = ''
    if (req.files && req.files.length > 0) {
      const data = await uploadImage(req.files)
      image = data?.Location
    }
    const { name, url, backendUrl, companyName, code, genre, category, slug } = req.body;

    const sql = `INSERT IGNORE INTO games_master_list (name, game_category, url , backend_base_url, company_name, game_code, game_slug, genre, image) VALUES (?,?,?,?,?,?,?,?,?)`;
    await write(sql, [name, category, url, backendUrl, companyName, code, slug, genre, image]);
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

    const { game_id, name, url, backendUrl, companyName, code, category, genre } = req.body;

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
    if (genre) {
      fieldsToUpdate.push("genre = ?");
      values.push(genre);
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

const validateGameSlug = async(req, res) => {
  try{
    const {gameName, slug} = req.body;
    if(!gameName || !slug) return res.status(400).send({ status: false, msg: 'Missing mandatory parameters'}); 
    if(slug.length < 7) return res.status(400).send({ status: false, msg: 'Invalid Slug Length'});
    const isSlugExist = variableConfig.games_masters_list.find(e=> e.game_slug == slug);
    if(isSlugExist) return res.status(400).send({ status: false, msg: "Slug already selected for another game"});
    const isSlugValid = validateSlug(slug, gameName);
    if(isSlugValid) return res.status(200).send({ status: true, msg: 'Slug validated'});
    else return res.status(400).send({ status: false, msg: 'Slug validation failed'});
  } catch (err) {
    console.error("Error creating game slug:", err);
    return res.status(500).json({ status: false, msg: "Internal server error", error: err.message });
  }
}

module.exports = { serviceAddGame, getGameDetails, validateGameSlug, getOperatorGame, getMasterListGames, refreshGameCache, getOperatorGamesForService, addGameForOperator, serviceUpdateGame, getAllGameDetails };

