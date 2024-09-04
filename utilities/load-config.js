const { read } = require("../db_config/db");

const variableConfig = {
    games_masters_list: []
}
const loadConfig = async()=> {
    console.log("DB Variables loaded in cache");
    const [data] = await read.query(`SELECT * from games_master_list WHERE is_active = 1`);
    variableConfig.games_masters_list = data   
}



module.exports = { variableConfig, loadConfig};