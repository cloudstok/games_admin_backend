const { write } = require("../../utilities/db-connection");
const { loadConfig, variableConfig } = require("../../utilities/load-config");

const add_webhook = async (req, res) => {
    try {
        const { user_id, url, event } = req.body;
        if (!user_id || !url || !event) {
            return res.status(400).send({ status: false, msg: "User ID, URL, and Event are required" });
        }
        const sql = "INSERT INTO webhook_config (user_id, webhook_url, event) VALUES (?, ?, ?)";
        await write(sql, [user_id, url, event]);
        await loadConfig({ loadWebhook: true });
        return res.status(200).send({ status: true, msg: "Webhook configured successfully" });
    } catch (err) {
        console.error("Error configuring webhook:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).send({ status: false, msg: "Webhook configuration already exists" });
        }
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}


const webhook = async (req, res) => {
    try {
        const { user_id } = req.params;
        if (!user_id) {
            return res.status(400).send({ status: false, msg: "User ID is required" });
        }
        const webhookDetails = variableConfig.webhook_data.filter(el => el.user_id === user_id) || [];
        if (webhookDetails.length === 0) {
            return res.status(404).send({ status: false, msg: "No webhook configurations found for the user" });
        }
        return res.status(200).send({ status: true, msg: "Webhook list fetched successfully", webhookDetails });
    } catch (err) {
        console.error("Error fetching webhook details:", err);
        if (err instanceof SyntaxError) {
            return res.status(400).send({ status: false, msg: "Invalid JSON in request body" });
        }
        return res.status(500).send({ status: false, msg: "Internal Server error" });
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
        const [getWebhookDetails] = await write(sql, [+limit, +offset]);
        return res.status(200).send({ status: true, msg: "Webhook list fetched successfully", getWebhookDetails })
    } catch (err) {
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}

const update_webhook_url = async (req, res) => {
    try {
        const { id, user_id, url, event, is_deleted } = req.body;

        if (!id) {
            return res.status(400).send({ status: false, msg: "Webhook ID is required for updating" });
        }

        // Build the SQL query dynamically to update only provided fields
        const fieldsToUpdate = [];
        const values = [];

        if (user_id) {
            fieldsToUpdate.push("user_id = ?");
            values.push(user_id);
        }
        if (url) {
            fieldsToUpdate.push("webhook_url = ?");
            values.push(url);
        }
        if (event) {
            fieldsToUpdate.push("event = ?");
            values.push(event);
        }
        if (parseInt(is_deleted) == 0 || parseInt(is_deleted) == 1) {
            const newStatus = is_deleted ? 0 : 1;
            fieldsToUpdate.push("is_deleted = ?");
            values.push(newStatus);
        }
        if (fieldsToUpdate.length === 0) {
            return res.status(400).send({ status: false, msg: "No fields provided to update" });
        }

        values.push(id);

        const sql = `UPDATE webhook_config SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
        await write(sql, values);

        await loadConfig({ loadWebhook: true });
        return res.status(200).send({ status: true, msg: "Webhook updated successfully" });
    } catch (err) {
        console.error("Error updating webhook:", err);
        return res.status(500).send({ status: false, msg: "Internal server error", error: err.message });
    }
};


module.exports = {
    add_webhook,
    get_webhook,
    webhook,
    update_webhook_url
}