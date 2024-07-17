
const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");
const { decryption } = require("../../utilities/ecryption-decryption");

const addWallet = async (req, res) => {
    const { user_id } = req.body;
    console.log({ user_id })
    if (!user_id) {
        return res.status(400).json({ status: false, msg: "User ID is required" });
    }
    const connection = await write.getConnection();
    try {
        await connection.beginTransaction();
        const insertWalletQuery = "INSERT IGNORE INTO user_wallet (user_id, balance) VALUES (?, ?)";
        const updateWalletQuery = "UPDATE user SET is_wallet = ? WHERE user_id = ?";
        // Execute both queries concurrently using Promise.all
        await Promise.all([
            connection.query(insertWalletQuery, [user_id, '3000.00']),
            connection.query(updateWalletQuery, [true, user_id])
        ]);
        await connection.commit();
        return res.status(200).json({ status: true, msg: "Wallet added successfully to master's list" });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        return res.status(500).json({ status: false, msg: "Internal server error" });
    } finally {
        connection.release();
    }
};




const findWallet = async (req, res) => {
    try {
        const { user_id } = req.params;
        // Validate user_id (if necessary)
        if (!user_id) {
            return res.status(400).json({ status: false, msg: "User ID is required" });
        }
        // Perform database query
        const [data] = await write.query("SELECT * FROM user_wallet WHERE user_id = ?", [user_id]);
        // Check if data is found
        if (!data || data.length === 0) {
            return res.status(404).json({ status: false, msg: "Wallet not found" });
        }
        // Return data
        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, msg: "Internal server error" });
    }
};





const AllWallet = async (req, res) => {
    try {
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        // Perform database query
        const [data] = await write.query("SELECT * FROM user INNER JOIN user_wallet ON user.user_id = user_wallet.user_id LIMIT ? OFFSET ?", [limit, offset]);
        // Return data
        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, msg: "Internal server error" });
    }
};


const userBalance = async (req, res) => {
    try {
        const { data } = req.body;
        const operatorUrl = 'http://' + req.headers.host;
        const [getOperator] = await write.query(`SELECT secret FROM operator WHERE url = ?`, [operatorUrl]);
        if (getOperator.length === 0) {
            return res.status(400).send({ status: false, msg: "Invalid Operator requested" });
        }
        const { secret } = getOperator[0];
        const { userId } = await decryption(data, secret);
        const [getUserWallet] = await write.query(`SELECT balance FROM user_wallet WHERE user_id = ?`, [userId]);
        if (getUserWallet.length === 0) {
            return res.status(400).send({ status: false, msg: "User wallet does not exist" });
        }
        const userBalance = getUserWallet[0].balance;
        return res.status(200).send({ status: true, msg: "User balance fetched successfully", balance: userBalance });
    } catch (err) {
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}


// const updateBalance = async (req, res) => {
//     try {
//         // const { operator_id } = req.params;
//         const { data } = req.body;
//         const token = req.headers.token;
//         let validateUser = await getRedis(token);
//         try {
//             validateUser = JSON.parse(validateUser);
//         } catch (err) {
//             return res.status(400).send({ status: false, msg: "We've encountered an internal error" })
//         }
//         let { operatorId, userId } = validateUser;
//         const [getOperator] = await write.query("SELECT secret FROM operator WHERE user_id = ?", [operatorId]);
//         if (getOperator.length > 0) {
//             const { secret } = getOperator[0];
//             let { amount, txn_type, txn_ref_id } = await decryption(data, secret);
                
//             let query = '';
//             if (txn_type === 1) {
//                 query = `UPDATE user_wallet SET balance = balance + ? WHERE user_id = ?`;
//             } else {
//                 query = `UPDATE user_wallet SET balance = balance - ? WHERE user_id = ?`;
//             }
//             const [updateUserBalance] = await write.query(query, [amount, userId]);
//             if (updateUserBalance.affectedRows != 0) {
//                 return res.status(200).send({ status: true, msg: "User balance updated successfully" });
//             } else {
//                 return res.status(400).send({ status: false, msg: "Unable to update user balance" });
//             }
//         } else {
//             return res.status(400).send({ status: false, msg: "Invalid Operator requested" });
//         }
//     } catch (err) {
//         console.log(err)
//         return res.status(500).json({ msg: "Internal server Error", status: false })
//     }
// }

const updateBalance = async (req, res) => {
    try {
        const { data } = req.body;
        const token = req.headers.token;
        // Validate user from Redis token
        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            console.error("Error parsing Redis token:", err);
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
        }
        const { operatorId, userId } = validateUser;
        // Fetch operator's secret
        const [getOperator] = await write.query("SELECT secret FROM operator WHERE user_id = ?", [operatorId]);
        if (getOperator.length === 0) {
            return res.status(400).send({ status: false, msg: "Invalid Operator requested" });
        }
        const { secret } = getOperator[0];
        // Decrypt transaction data
        const { amount, txn_type } = await decryption(data, secret);
        // Prepare SQL query based on transaction type
        let query = '';
        console.log({ amount, txn_type}, typeof txn_type)
        console.log(txn_type === 1, txn_type == 1, txn_type)
        if (txn_type === 1) {
            query = `UPDATE user_wallet SET balance = balance + ? WHERE user_id = ?`;
        } else {
            query = `UPDATE user_wallet SET balance = balance - ? WHERE user_id = ?`;
        }
        // Execute update query
        const [updateUserBalance] = await write.query(query, [amount, userId]);
        if (updateUserBalance.affectedRows !== 0) {
            return res.status(200).send({ status: true, msg: "User balance updated successfully" });
        } else {
            return res.status(400).send({ status: false, msg: "Unable to update user balance" });
        }
    } catch (err) {
        console.error("Error updating user balance:", err);
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}



module.exports = { addWallet, findWallet, userBalance, updateBalance, AllWallet }