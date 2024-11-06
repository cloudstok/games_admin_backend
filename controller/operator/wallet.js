
const {write, getWritePool } = require("../../utilities/db-connection");
const { getRedis } = require("../../utilities/redis-connection");
const { decryption } = require("../../utilities/ecryption-decryption");

const addWallet = async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) {
        return res.status(400).json({ status: false, msg: "User ID is required" });
    }
    const writePool = getWritePool();
    const connection = await writePool.getConnection();
    try {
        await connection.beginTransaction();
        const insertWalletQuery = "INSERT IGNORE INTO user_wallet (user_id, balance) VALUES (?, ?)";
        const updateWalletQuery = "UPDATE user SET is_wallet = ? WHERE user_id = ?";
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
        if (!user_id) {
            return res.status(400).json({ status: false, msg: "User ID is required" });
        }
        const [data] = await write("SELECT * FROM user_wallet WHERE user_id = ?", [user_id]);
        if (!data || data.length === 0) {
            return res.status(404).json({ status: false, msg: "Wallet not found" });
        }
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
        offset = parseInt(offset);
        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        const [data] = await write("SELECT * FROM user INNER JOIN user_wallet ON user.user_id = user_wallet.user_id LIMIT ? OFFSET ?", [limit, offset]);
        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, msg: "Internal server error" });
    }
};


const userBalance = async (req, res) => {
    try {
        const token = req.headers.token;
        if(!token) return res.status(400).send({ status: false, msg: "Necassary token missing in headers"});
        const getUserDetails = await getRedis(token);
        if(!getUserDetails) return res.status(400).send({ status: false, msg: "Invalid User Details or session timed out"});
        const parsedUser = JSON.parse(getUserDetails);
        const [getUserWallet] = await write(`SELECT balance FROM user_wallet WHERE user_id = ?`, [parsedUser.userId]);
        if (getUserWallet.length === 0) {
            return res.status(400).send({ status: false, msg: "User wallet does not exist" });
        }
        const balance = getUserWallet[0].balance;
        return res.status(200).send({ status: true, msg: "User balance fetched successfully", data: {balance} });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
}

const updateBalance = async (req, res) => {
    try {
        const { data } = req.body;
        // return res.status(422).send({ status: false, msg: "Error Occurred"})
        const token = req.headers.token;
        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            console.error("Error parsing Redis token:", err);
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
        }
        const { operatorId, userId } = validateUser;
        const [getOperator] = await write("SELECT secret FROM operator WHERE user_id = ?", [operatorId]);
        if (getOperator.length === 0) {
            return res.status(400).send({ status: false, msg: "Invalid Operator requested" });
        }
        const { secret } = getOperator[0];
        const { amount, txn_type } = await decryption(data, secret);
        let query = '';
        if (txn_type === 1) {
            query = `UPDATE user_wallet SET balance = balance + ? WHERE user_id = ?`;
        } else {
            query = `UPDATE user_wallet SET balance = balance - ? WHERE user_id = ?`;
        }
        const [updateUserBalance] = await write(query, [amount, userId]);
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