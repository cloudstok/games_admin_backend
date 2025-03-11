require('dotenv').config();

const fs = require('fs');
const { read,write,checkDatabaseConnection } = require('./utilities/db-connection');
const { getTransactionForRollback, generateUUIDv7 } = require('./utilities/common_function');
const { loadConfig,variableConfig } = require('./utilities/load-config');
const { encryption } = require('./utilities/ecryption-decryption');
const { default: axios } = require('axios');

const query = `SELECT user_id, game_id,lobby_id, session_token, operator_id, txn_id, amount, txn_ref_id, description, txn_type FROM games_admin.transaction where  created_at  > '2024-12-06 07:58:00' and created_at < '2024-12-06 10:40:00' and operator_id = "Zplay_Production_5195"   order by txn_type,created_at`;

async function getRollbackData(){
  await checkDatabaseConnection();
  const res = await read(query);
  fs.writeFileSync('./rollback.json',JSON.stringify(res[0]));
  console.log(res);
}
// getRollbackData();
async function doRollback(){
  await checkDatabaseConnection();
  await loadConfig({loadAll:true});
  const elems =[];
  const rollbackElem = require('./rollback.json');
  // const elem1=[...rollbackElem.filter((e,i)=>i<100)];
  for(const elem of rollbackElem){
  console.log(`processing transaction ${rollbackElem.indexOf(elem)}`)
  const ip = '210.89.34.155';
  let { amount, txn_id, game_id, user_id,lobby_id, operator_id, txn_type, session_token, description } = elem;
  if(txn_type!=0)
    continue;
  description=description.replace("debit","rollback")
  const game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;
  const operator_data = (variableConfig.operator_data.find(e=>e.user_id==operator_id));
  const webhook_data = (variableConfig.webhook_data.find(e=>e.user_id==operator_id && e.event=='UPDATE_BALANCE'))
  const trx_id = await generateUUIDv7();
  const data = { amount, txn_id: trx_id, txn_ref_id: txn_id, description: description, txn_type: 2, ip, game_id, user_id, game_code }
  const encryptedData = await encryption(data, operator_data.secret);
  const postOptions = {
    method: 'POST',
    url: webhook_data.webhook_url,
    headers: {
        'Content-Type': 'application/json',
        token: session_token
    },
    timeout: 1000 * 3,
    data: { data: encryptedData }
};
  try {
    await axios(postOptions);
    elems.push({txn_id,status:"success"});
    await write("INSERT INTO transaction (user_id, game_id , session_token , operator_id, txn_id, amount, lobby_id, txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, session_token, operator_id, trx_id, amount, lobby_id, txn_id, description, `${txn_type}`, '2']]);
  } catch (err) {
    elems.push({txn_id,status:"fail",message:err?.response?.data?.message});
  }
  }
  fs.writeFileSync("./trxSummary.json",JSON.stringify(elems));
  process.exit(0);
}
doRollback();