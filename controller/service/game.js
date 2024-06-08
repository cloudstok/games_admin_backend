const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");

const getOperatorGame = async(req, res)=> {
    try{
        let token = req.headers.token;
        let validateUser = await getRedis(token);
        validateUser = JSON.parse(validateUser)
        if (validateUser) {
            const {operatorId} = validateUser
            const [gamesList] = await write.query(`SELECT * FROM operator_games as og INNER JOIN games_master_list as gml on gml.game_id = og.game_id WHERE operator_id = ?`, [operatorId]);
            return res.status(200).send({ status: true, msg: "Games fetched successfully for operator", data: gamesList });
        } else {
            return res.status(200).send({ status: true, msg: "Token Expired or Request timed out.!" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const serviceAddGame = async (req, res) => {
    try {
        let token = req.headers.token;
        let validateUser = await getRedis(token);
        validateUser = JSON.parse(validateUser)
        if (validateUser) {
            const operator_id = validateUser.operatorId
            const { game_id } = req.body
            await write.query("insert into operator_games (operator_id , game_id) value(? , ?)", [operator_id, game_id])
            return res.status(200).send({ status: true, msg: "Game onboarded successfully for operator" });
        } else {
            return res.status(200).send({ status: true, msg: "Token Expired" });
        }

    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}



module.exports = { serviceAddGame, getOperatorGame };

