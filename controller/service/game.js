const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");

const axios = require('axios');


const serviceAddGame = async (req ,res)=>{
    try{
        let token = req.headers.token;
        let validateUser = await getRedis(token);
        validateUser = JSON.parse(validateUser)
        console.log(validateUser)
        if(validateUser){
            const  operator_id  =  validateUser.operatorId
            const { game_id } = req.body
           await write.query("insert into operator_games (operator_id , game_id) value(? , ?)" , [operator_id , game_id])
           return res.status(200).send({ status: true, msg: "Game onboarded successfully for operator" });
        }else{
            return res.status(200).send({ status: true, msg: "Token Expired" });
        }
        
    }catch(err){
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}
const serviceFindGame = async (req ,res)=>{
    try{
 
    let config = {
      method: 'GET',
      url: 'localhost:4000/service/operator/game',
      headers: { 
        'token': ''
      },
      data : data
    };
    
    axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });
    

    }catch(er){
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}


module.exports = {serviceAddGame , serviceFindGame}

