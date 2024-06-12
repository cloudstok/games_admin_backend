
const { read, write } = require("../../db_config/db");
const { decryption } = require("../../utilities/ecryption-decryption");
const addWallet = async (req ,res)=>{
    try{
        const {user_id } = req.body
       await write.query("insert into user_wallet (user_id ,balance) value(? , ?)" , [user_id , '3000'])
       return res.status(200).send({ status: true, msg: "Wallet Add successfully to master's list" })
    }catch(err){
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}
const findWallet = async (req ,res)=>{
    try{
        const {user_id} = req.params
    //  const {} =  await decryption(data , pub_key)
    const [data]=  await write.query("select * from user_wallet user_id = ? " , [user_id])
        return res.status(200).send({ status: true, data })
    }catch(er){
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const AllWallet = async (req ,res)=>{
    try{
    const [data]=  await write.query("SELECT * FROM user inner join user_wallet on user.user_id = user_wallet.user_id;")
        return res.status(200).send({ status: true, data })
    }catch(er){
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const userBalance = async(req, res)=> {
    try{
        const {operator_id} = req.params;
        const {data} = req.body;
        const [getOperator] = await write.query(`SELECT secret FROM operator WHERE user_id = ?`, [operator_id]);
        if(getOperator.length > 0){
            const {secret} = getOperator[0];
            const {userId} = await decryption(data, secret);
            const [getUserWallet] = await write.query(`SELECT balance from user_wallet WHERE user_id = ?`, [userId]);
            if(getUserWallet.length > 0){
                return res.status(200).send({ status: true, msg: "User balance fetched successfully", balance: getUserWallet[0]});
            }else{  
                return res.status(400).send({ status: false, msg: "User wallet does not exists"});
            }
        }else{
            return res.status(400).send({ status: false, msg: "Invalid Operator requested"});
        }
    }catch(err){
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const updateBalance = async(req, res)=> {
    try{
        const {operator_id} = req.params;
        const {data} = req.body;
        const [getOperator] = await write.query(`SELECT secret FROM operator WHERE user_id = ?`, [operator_id]);
        if(getOperator.length > 0){
            const {secret} = getOperator[0];
            const {userId, balance} = await decryption(data, secret);
            const [updateUserBalance] = await write.query(`UPDATE user_wallet SET balance = ? WHERE user_id = ?`, [balance, userId]);
            if(updateUserBalance.affectedRows != 0){
                return res.status(200).send({ status: true, msg: "User balance updated successfully", balance});
            }else{  
                return res.status(400).send({ status: false, msg: "Unable to update user balance"});
            }
        }else{
            return res.status(400).send({ status: false, msg: "Invalid Operator requested"});
        }
    }catch(err){
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

module.exports = {addWallet , findWallet, userBalance, updateBalance , AllWallet}