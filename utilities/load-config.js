const { read } = require("./db-connection");

const variableConfig = {
    games_masters_list: [],
    webhook_data : [],
    operator_data: [],
    user_credentials :[],
    game_webhook_event : []
}

const loadConfig = async (params = {}) => {
    const { loadAll = false, loadGames = false, loadWebhook = false, loadOperator = false , loaduser_credentials = false , loadgame_webhook = false } = params;

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
    if (loadAll || loadgame_webhook) {
        const [operatorData] = await read(`SELECT * FROM game_webhook_config`);
        variableConfig.game_webhook_event = operatorData;
    }
    console.log("DB Variables loaded in cache");
};


const loadConfigTOAPI = async (req, res) => {
    try {
        const { loadAll = false, loadGames = false, loadWebhook = false, loadOperator = false, loaduser_credentials = false } = req.body;
        await loadConfig({ loadAll, loadGames, loadWebhook, loadOperator, loaduser_credentials });
        res.status(200).json({ status : true ,message: "DB Variables loaded in cache successfully" });
    } catch (error) {
        console.error("Error loading config:", error);
        res.status(500).json({ message: "Error loading config", error: error.message });
    }
};

const initCacheRefresh = () => {
    setInterval(()=> loadConfig({ loadAll: true}), 5 * 60 * 1000);
}



module.exports = { variableConfig, loadConfig , loadConfigTOAPI, initCacheRefresh};