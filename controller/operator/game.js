
const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");


const addGame = async (req ,res)=>{
    try{
        const { operator_id , game_id } = req.body
       await write.query("insert into operator_games (operator_id , game_id) value(? , ?)" , [operator_id , game_id])
       return res.status(200).send({ status: true, msg: "Game onboarded successfully for operator" });
    }catch(err){
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}
const findGame = async (req ,res)=>{
    try{
    let token = req.headers.token;
    let validateUser = await getRedis(token);
    try{
        validateUser = JSON.parse(validateUser)
    }catch(err){
        console.error(`[ERR] while parsing json data is::`, err);
        return res.status(500).send({ status: false, msg: "Internal Server Error"})
    }
    if(validateUser){
        const [data]=  await write.query("select * from operator_games as op right join games_master_list as gml on gml.game_id = op.game_id where operator_id = ?", [validateUser.operatorId]);
        return res.status(200).send({ status: true, data })
    }else{
        return res.status(400).send({ status: false, msg: "Session expired.! Please login again."});
    }
    }catch(er){
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}



module.exports = {addGame , findGame}