const { read } = require("./db-connection");

const variableConfig = {
    games_masters_list: [],
    webhook_data : [],
    operator_data: [],
    user_credentials :[]
}

const loadConfig = async (params = {}) => {
    const { loadAll = false, loadGames = false, loadWebhook = false, loadOperator = false , loaduser_credentials = false } = params;

    if (loadAll || loadGames) {
        const [data] = await read(`SELECT * FROM games_master_list WHERE is_active = 1`);
        variableConfig.games_masters_list = data;
    }

    if (loadAll || loadWebhook) {
        const [webhookData] = await read(`SELECT * FROM webhook_config`);
        variableConfig.webhook_data = webhookData;
    }

    if (loadAll || loadOperator) {
        const [operatorData] = await read(`SELECT * FROM operator WHERE is_deleted = 0`);
        variableConfig.operator_data = operatorData;
    }
    if (loadAll || loaduser_credentials) {
        const [operatorData] = await read(`SELECT * FROM user_credentials`);
        variableConfig.user_credentials = operatorData;
    }
    console.log("DB Variables loaded in cache");
};




module.exports = { variableConfig, loadConfig};