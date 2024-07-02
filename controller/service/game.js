const { default: axios } = require("axios");
const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");

const getOperatorGame = async (req, res) => {
    try {
        let token = req.headers.token;
        let validateUser = await getRedis(token);

        validateUser = JSON.parse(validateUser)
        if (validateUser) {
            const { operatorId } = validateUser
            const [gamesList] = await write.query(`SELECT * FROM operator_games as og INNER JOIN games_master_list as gml on gml.game_id = og.game_id WHERE operator_id = ?`, [operatorId]);
            return res.status(200).send({ status: true, msg: "Games fetched successfully for operator", data: gamesList });
        } else {
            return res.status(401).send({ status: false, msg: "Token Expired or Request timed out.!" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const getOperatorGamesForService = async (req, res) => {
    try {
        if (req.operator?.user?.user_type === 'admin') {
            const { operator_id } = req.params;
            const [gamesList] = await write.query(`SELECT * FROM operator_games as og INNER JOIN games_master_list as gml on gml.game_id = og.game_id WHERE operator_id = ?`, [operator_id]);
            return res.status(200).send({ status: true, msg: "Games fetched successfully for operator", data: gamesList });
        } else {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const addGameForOperator = async (req, res) => {
    try {
        if (req.operator?.user?.user_type === 'admin') {
            const { operator_id, game_id } = req.body;
            await write.query(`INSERT IGNORE INTO operator_games (game_id, operator_id) values(?,?)`, [game_id, operator_id]);
            return res.status(200).send({ status: true, msg: "Game assigned successfully to operator" });
        } else {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const serviceAddGame = async (req, res) => {
    try {
        if (req.operator?.user?.user_type === 'admin') {
            const { name, url } = req.body
            await write.query("insert IGNORE into games_master_list (name , url ) value(? , ?)", [name, url])
            return res.status(200).send({ status: true, msg: "games Add successfully to master's list" })
        } else {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }

    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const getMasterListGames = async (req, res) => {
    try {
        let { limit, offset } = req.query
        if (!(limit && offset)) {
            limit = 100
            offset = 0
        }
        if (req.operator?.user?.user_type === 'admin') {
            const [gamesList] = await write.query(`SELECT * FROM games_master_list WHERE is_active = 1  limit ? offset ?`, [+limit, +offset]);
            return res.status(200).send({ status: true, msg: "Games list fetched successfully", gamesList });
        } else {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}


const getGame = async(erq ,res)=>{
    try{
        const data =  await axios()

    }catch(er){
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}


module.exports = { serviceAddGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator };

