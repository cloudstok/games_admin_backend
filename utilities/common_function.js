const crypto = require('crypto');
const { variableConfig } = require('./load-config');
async function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = "";
    for (let i = 0; i < length; i++) {
      randomString += chars[Math.floor(Math.random() * chars.length)];
    }
    return randomString;
  }

  
async function generateRandomUserId(name) {
    return `${name}_${Math.round(Math.random() * 10000)}`;
  }

async function generateUUID() {
    function getRandomHexDigit() {
        return Math.floor(Math.random() * 16).toString(16);
    }

    // Generate UUID parts
    let uuid = '';
    for (let i = 0; i < 8; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-';
    for (let i = 0; i < 4; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-4'; // UUID version 4
    for (let i = 0; i < 3; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-';
    uuid += (8 + Math.floor(Math.random() * 4)).toString(16); // Set bits 6-7 to 10
    for (let i = 0; i < 3; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-';
    for (let i = 0; i < 12; i++) {
        uuid += getRandomHexDigit();
    }

    return uuid;
}


async function generateUUIDv7() {
    const timestamp = Date.now();
    const timeHex = timestamp.toString(16).padStart(12, '0');
    const randomBits = crypto.randomBytes(8).toString('hex').slice(2);
    const uuid = [
        timeHex.slice(0, 8), 
        timeHex.slice(8) + randomBits.slice(0, 4), 
        '7' + randomBits.slice(4, 7), 
        (parseInt(randomBits.slice(7, 8), 16) & 0x3f | 0x80).toString(16) + randomBits.slice(8, 12),
        randomBits.slice(12)
    ];

    return uuid.join('-');
}

const getWebhookUrl = async(user_id, event_name) => {
    try{
        const webhookUrl = (variableConfig.webhook_data.find(e=> e.user_id === user_id && e.event === event_name))?.webhook_url || false;
        return webhookUrl;
    }catch(err){
        return err;
    }
}

const getRollbackOptions = async(data)=> {
    const { amount, txn_id, ip, game_id, user_id, game_code, secret, operatorUrl, token} = data;
    const trx_id = generateUUIDv7();
    const description = `${amount} Rollback-ed for transaction with reference ID ${txn_id}`
    let encryptedData;
    try {
        encryptedData = await encryption({ amount, txn_id: trx_id, txn_ref_id: txn_id, description, txn_type: 2, ip, game_id, user_id, game_code }, secret);
    } catch (err) {
        return;
    }
    const postOptions = {
        method: 'POST',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token
        },
        timeout: 1000 * 3,
        data: { data: encryptedData }
    };
    const dbData = { txn_id: trx_id, description, txn_ref_id: txn_id, txn_type: 2, amount, game_id, userId: user_id, token, operatorId: data.operatorId};
    return {options: postOptions, dbData};
}

const getCashoutOptions = async(data)=> {
    const { amount, txn_id, txn_ref_id, ip, game_id, user_id, txn_type, game_code, secret, operatorUrl, token, description} = data;
    let encryptedData;
    try {
        encryptedData = await encryption({ amount, txn_id, txn_ref_id, description, txn_type, ip, game_id, user_id, game_code }, secret);
    } catch (err) {
        return;
    }
    const postOptions = {
        method: 'POST',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token
        },
        timeout: 1000 * 3,
        data: { data: encryptedData }
    };
    return {options: postOptions, dbData: data};
}


const createOptions =(url, options)=>{
    let token = options.token;
    let clientServerOptions = {
        url,
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            token
        },
        data:{
            data: options
        }
    }
    return clientServerOptions
}

module.exports = { generateRandomString, generateRandomUserId, generateUUID , generateUUIDv7, getWebhookUrl, createOptions, getRollbackOptions, getCashoutOptions}