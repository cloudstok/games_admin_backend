require('dotenv').config();

const fs = require('fs');
const { read, write, checkDatabaseConnection } = require('./utilities/db-connection');
const { getTransactionForRollback, generateUUIDv7 } = require('./utilities/common_function');
const { loadConfig, variableConfig } = require('./utilities/load-config');
const { encryption } = require('./utilities/ecryption-decryption');
const { default: axios } = require('axios');

// const query = `SELECT user_id, game_id, lobby_id, session_token, operator_id, txn_id, amount, txn_ref_id, description, txn_type FROM games_admin.transaction where created_at  > '2025-09-02 11:45:00' and created_at < '2025-09-02 13:00:00'`;

// async function getRollbackData() {
//   await checkDatabaseConnection();
//   const res = await read(query);
//   fs.writeFileSync('./rollback.json', JSON.stringify(res[0]));
//   console.log(res);
// }
// getRollbackData();


// async function doRollback() {
//   await checkDatabaseConnection();
//   await loadConfig({ loadAll: true });
//   const elems = [];
//   const rollbackElem = require('./rollback.json');
//   // const elem1=[...rollbackElem.filter((e,i)=>i<100)];
//   for (const elem of rollbackElem) {
//     console.log(`processing transaction ${rollbackElem.indexOf(elem)}`)
//     const ip = '210.89.34.155';
//     let { amount, txn_id, game_id, user_id, lobby_id, operator_id, txn_type, session_token, description } = elem;
//     if (txn_type != 0)
//       continue;
//     description = description.replace("debit", "rollback")
//     const game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;
//     const operator_data = (variableConfig.operator_data.find(e => e.user_id == operator_id));
//     const webhook_data = (variableConfig.webhook_data.find(e => e.user_id == operator_id && e.event == 'UPDATE_BALANCE'))
//     const trx_id = await generateUUIDv7();
//     const data = { amount, txn_id: trx_id, txn_ref_id: txn_id, description: description, txn_type: 2, ip, game_id, user_id, game_code }
//     const encryptedData = await encryption(data, operator_data.secret);
//     const postOptions = {
//       method: 'POST',
//       url: webhook_data.webhook_url,
//       headers: {
//         'Content-Type': 'application/json',
//         token: session_token
//       },
//       timeout: 1000 * 10,
//       data: { data: encryptedData }
//     };
//     try {
//       await axios(postOptions);
//       elems.push({ txn_id, status: "success" });
//       await write("INSERT INTO transaction (user_id, game_id , session_token , operator_id, txn_id, amount, lobby_id, txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, session_token, operator_id, trx_id, amount, lobby_id, txn_id, description, `${txn_type}`, '2']]);
//     } catch (err) {
//       elems.push({ txn_id, status: "fail", message: err?.response?.data?.message });
//     }
//   }
//   fs.writeFileSync("./trxSummary.json", JSON.stringify(elems));
//   process.exit(0);
// }
// doRollback();


// const fs = require('fs');
//  const readline = require('readline');

// // Path to your JSONL file
// const inputFile = './2025-09-02-Failed_Third_Party_Data.jsonl';
// Path for output JSON file
// const outputFile = 'data.json';

// async function convertJsonlToJson() {
//   const fileStream = fs.createReadStream(inputFile);

//   const rl = readline.createInterface({
//     input: fileStream,
//     crlfDelay: Infinity
//   });

//   const dataArray = [];

//   for await (const line of rl) {
//     if (line.trim()) { // skip empty lines
//       try {
//         const jsonObj = JSON.parse(JSON.parse(line).msg);
//         if (!jsonObj.hasOwnProperty('res3') && typeof jsonObj.req == 'string') {
//           const updatedUserObj = JSON.parse(jsonObj.req);
//           if (updatedUserObj.operatorId == 'victoryeach_live_1924') dataArray.push(jsonObj)
//         };
//       } catch (err) {
//         console.error('Invalid JSON line:', line);
//       }
//     }
//   }

//   // Save as JSON array
//   fs.writeFileSync(outputFile, JSON.stringify(dataArray, null, 2));

//   console.log(`Converted ${inputFile} to ${outputFile}`);
// }

// convertJsonlToJson();


async function doRollback() {
await checkDatabaseConnection();
await loadConfig({ loadAll: true });
const elems = [];
const rollbackElem = require('./data.json');
// const elem1=[...rollbackElem.filter((e,i)=>i<100)];
for (const elem of rollbackElem) {
  const reqBody = JSON.parse(elem.req);
  console.log(`processing transaction ${rollbackElem.indexOf(elem)}`)
  let { amount, txn_id, ip, game_id, user_id, txn_ref_id, operatorId, txn_type, token, description } = reqBody;
  if (txn_type == 1) {
    const lobbyIdParts = description.trim().split(' ');
    const lobby_id = lobbyIdParts[lobbyIdParts.length - 1];
    const game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;
    const operatorData = variableConfig.operator_data.find(e => e.user_id == operatorId);
    const webhook_data = (variableConfig.webhook_data.find(e => e.user_id == operatorId && e.event == 'UPDATE_BALANCE'));
    const trx_id = await generateUUIDv7();
    const data = { amount, txn_id: trx_id, txn_ref_id, description: description, txn_type, ip, game_id, user_id, game_code }
    const encryptedData = await encryption(data, operatorData.secret);

    const postOptions = {
      method: 'POST',
      url: webhook_data.webhook_url,
      headers: {
        'Content-Type': 'application/json',
        token,
        'x-user-id': user_id
      },
      timeout: 1000 * 10,
      data: { data: encryptedData }
    };

    try {
      await axios(postOptions);
      elems.push({ txn_id, status: "success", data: reqBody });
      await write("INSERT INTO transaction (user_id, game_id, session_token, operator_id, txn_id, amount, lobby_id, txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, token, operatorId, trx_id, amount, lobby_id, txn_ref_id, description, `${txn_type}`, '2']]);
    } catch (err) {
      elems.push({ status: "fail", message: err?.response?.data?.message, data: reqBody });
    }
  };



      // if (txn_type != 0)
      //   continue;
      // description = description.replace("debit", "rollback")
      // const game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;
      // const operator_data = (variableConfig.operator_data.find(e => e.user_id == operator_id));
      // const webhook_data = (variableConfig.webhook_data.find(e => e.user_id == operator_id && e.event == 'UPDATE_BALANCE'))
      // const trx_id = await generateUUIDv7();
      // const data = { amount, txn_id: trx_id, txn_ref_id: txn_id, description: description, txn_type: 2, ip, game_id, user_id, game_code }
      // const encryptedData = await encryption(data, operator_data.secret);
      // const postOptions = {
      //   method: 'POST',
      //   url: webhook_data.webhook_url,
      //   headers: {
      //     'Content-Type': 'application/json',
      //     token: session_token
      //   },
      //   timeout: 1000 * 10,
      //   data: { data: encryptedData }
      // };
      // try {
      //   await axios(postOptions);
      //   elems.push({ txn_id, status: "success" });
      //   await write("INSERT INTO transaction (user_id, game_id , session_token , operator_id, txn_id, amount, lobby_id, txn_ref_id , description, txn_type, txn_status) VALUES (?)", [[user_id, game_id, session_token, operator_id, trx_id, amount, lobby_id, txn_id, description, `${txn_type}`, '2']]);
      // } catch (err) {
      //   elems.push({ txn_id, status: "fail", message: err?.response?.data?.message });
      // }
}
fs.writeFileSync("./settledTrxSummary.json", JSON.stringify(elems));
process.exit(0);
}
doRollback();