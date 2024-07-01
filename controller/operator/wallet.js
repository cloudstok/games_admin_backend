
const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");
const { decryption } = require("../../utilities/ecryption-decryption");
const addWallet = async (req, res) => {
    try {
        const { user_id } = req.body
        await write.query("insert IGNORE into user_wallet (user_id ,balance) value(? , ?)", [user_id, '3000.00'])
        await write.query("update user set is_wallet = ? where  user_id  = ?", [true, user_id])
        return res.status(200).send({ status: true, msg: "Wallet Add successfully to master's list" })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}
const findWallet = async (req, res) => {
    try {
        const { user_id } = req.params
        //  const {} =  await decryption(data , pub_key)
        const [data] = await write.query("select * from user_wallet user_id = ? ", [user_id])
        return res.status(200).send({ status: true, data })
    } catch (er) {
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const AllWallet = async (req, res) => {
    try {
        let { limit, offset } = req.query
        if (!(limit && offset)) {
            limit = 100
            offset = 0
        }
        const [data] = await write.query("SELECT * FROM user inner join user_wallet on user.user_id = user_wallet.user_id limit  ?  offset ?", [+limit, +offset])
        return res.status(200).send({ status: true, data })
    } catch (er) {
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const userBalance = async (req, res) => {
    try {
        const { data } = req.body;
        const [getOperator] = await write.query(`SELECT secret FROM operator WHERE url = ?`, ['http://' + req.headers.host]);
        if (getOperator.length > 0) {
            const { secret } = getOperator[0];
            const { userId } = await decryption(data, secret);
            const [getUserWallet] = await write.query(`SELECT balance from user_wallet WHERE user_id = ?`, [userId]);
            if (getUserWallet.length > 0) {
                return res.status(200).send({ status: true, msg: "User balance fetched successfully", balance: getUserWallet[0].balance });
            } else {
                return res.status(400).send({ status: false, msg: "User wallet does not exists" });
            }
        } else {
            return res.status(400).send({ status: false, msg: "Invalid Operator requested" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const updateBalance = async (req, res) => {
    try {
        // const { operator_id } = req.params;
        const { data } = req.body;
        const token = req.headers.token;
        let validateUser = await getRedis(token);
        try {
            validateUser = JSON.parse(validateUser);
        } catch (err) {
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" })
        }
        let { operatorId, userId } = validateUser;
        const [getOperator] = await write.query("SELECT secret FROM operator WHERE user_id = ?", [operatorId]);
        if (getOperator.length > 0) {
            const { secret } = getOperator[0];
            let { amount, txn_type, txn_ref_id } = await decryption(data, secret);
            if (txn_type === 1){
                 let [[{balance}]] =  await read.query("SELECT balance FROM transaction where txn_id = ? limit 1" , [txn_ref_id]);
                 amount = +amount + +balance;
            }
                
            let query = '';
            if (txn_type === 1) {
                query = `UPDATE user_wallet SET balance = balance + ? WHERE user_id = ?`;
            } else {
                query = `UPDATE user_wallet SET balance = balance - ? WHERE user_id = ?`;
            }
            const [updateUserBalance] = await write.query(query, [amount, userId]);
            if (updateUserBalance.affectedRows != 0) {
                return res.status(200).send({ status: true, msg: "User balance updated successfully" });
            } else {
                return res.status(400).send({ status: false, msg: "Unable to update user balance" });
            }
        } else {
            return res.status(400).send({ status: false, msg: "Invalid Operator requested" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

module.exports = { addWallet, findWallet, userBalance, updateBalance, AllWallet }