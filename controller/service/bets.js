const axios = require('axios');


const bets = async (req, res)=>{
    try{
      let {data} = await axios.get(process.env.bets_base_url)
         return res.status(200).send({statu : true , msg : "Find Data" , data : data.data  })
    }catch(er){
        console.error(er);
        return res.status(500).send({status : false , msg : "internal server Error" , er})
    }
}

module.exports = {bets}