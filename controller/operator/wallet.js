
const { read, write } = require("../../db_config/db");
const { decryption } = require("../../utilities/ecryption-decryption");
const addWallet = async (req ,res)=>{
    try{
        const {user_id ,balance } = req.body
       await write.query("insert into user_wallet (user_id ,balance) value(? , ?)" , [user_id , balance])
       return res.status(200).send({ status: true, msg: "Wallet Add successfully to master's list" })
    }catch(err){
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}
const findWallet = async (req ,res)=>{
    try{
        const {user_id} = req.body
     const {} =  await decryption(data , pub_key)
    const [data]=  await write.query("select * from user_wallet user_id = ? " , [req.query.user_id])
        return res.status(200).send({ status: true, data })
    }catch(er){
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}



module.exports = {addWallet , findWallet}