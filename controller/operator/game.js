const { read, write } = require("../../db_config/db");

const addGame = async (req ,res)=>{
    try{
        const {name, url} = req.body
       await write.query("insert into games_master_list (name , url ) value(? , ?)" , [name , url])
       return res.status(200).send({ status: true, msg: "games Add successfully to master's list" })
    }catch(err){
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })

    }
}
const findGame = async (req ,res)=>{
    try{
    const [data]=  await write.query("select * from games_master_list")
        return res.status(200).send({ status: true, data })
    }catch(er){
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })

    }
}



module.exports = {findGame , addGame}