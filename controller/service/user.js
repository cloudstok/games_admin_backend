const { getRedis, deleteRedis } = require("../../redis/connection");

const activeUser =  async(req , res)=>{
    try{
//   await deleteRedis('users')
const finalData =[]
        let user = JSON.parse(await getRedis('users'))
        console.log(user)
        if(user){
            for(let x of user){
                //  {x : JSON.parse(await getRedis(x))}
                loginUser = {...JSON.parse(await getRedis(x)) , 'token' : x}
                finalData.push (loginUser)
            }
        }

return res.status(200).send({status :true , finalData })
    }catch(err){
        console.error(err);
       return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

module.exports = {activeUser}