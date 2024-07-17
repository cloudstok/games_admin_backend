const { write } = require("../../db_config/db");


const add_webhook = async (req, res) => {
    try {
        const { user_id, url, event } = req.body
        const sql = "INSERT INTO webhook_config (user_id, webhook_url , event) VALUES (?, ? , ?)"
        await write.query(sql, [user_id, url, event]);
        return res.status(200).send({ status: true, msg: "Webhook configured successfully" });
    } catch (err) {
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}


const webhook = async (req, res) => {
    try {
        const { user_id } = req.params
        const sql = "SELECT * FROM webhook_config where user_id = ?"
        const [getWebhookDetails] = await write.query(sql, [user_id]);
        return res.status(200).send({ status: true, msg: "Webhook list fetched successfully", getWebhookDetails })
    } catch (err) {
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}


const get_webhook = async (req, res) => {
    try {
        
        let { limit = 100, offset = 0 } = req.query;
        limit = parseInt(limit);
        offset = parseInt(offset);

        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
        }
        const sql = "SELECT * FROM webhook_config limit ? offset ?"
        const [getWebhookDetails] = await write.query(sql, [+limit, +offset]);
        return res.status(200).send({ status: true, msg: "Webhook list fetched successfully", getWebhookDetails })
    } catch (err) {
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}


module.exports = {
    add_webhook,
    get_webhook,
    webhook
}