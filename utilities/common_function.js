const crypto = require('crypto');
const {write} = require('../db_config/db');
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
        const [getWebhookUrl] = await write.query(`SELECT webhook_url FROM webhook_config where user_id = ? and event = ?`, [user_id, event_name]);
        return getWebhookUrl[0].webhook_url;
    }catch(err){
        return false;
    }
}

const getEventOptions = async(data, event) => {
    if (event === 'cashout') {
        cashout_retries += 1;
        await write.query(`UPDATE pending_transactions SET cashout_retries = ?, event = ? WHERE id = ?`, [cashout_retries, 'cashout', id]);
    } else {
        rollback_retries += 1;
        await write.query(`UPDATE pending_transactions SET rollback_retries = ?, event = ? WHERE id = ?`, [rollback_retries, 'rollback', id]);
        let { token, txn_ref_id } = options;
        let [getRollbackTransaction] = await write.query(`SELECT * FROM transaction WHERE txn_id = ?`, [txn_ref_id]);
        if (getRollbackTransaction.length > 1) {
            getRollbackTransaction = getRollbackTransaction[1];
        } else {
            getRollbackTransaction = getRollbackTransaction[0];
            rollbackFlag = 1;
        }
        let rollbackAmount = getRollbackTransaction.amount;
        let transactionId = getRollbackTransaction.txn_type === '2' ? getRollbackTransaction.txn_id : generateUUIDv7();
        data = {
            token, txn_id: transactionId, txn_ref_id, amount: rollbackAmount, description: `${rollbackAmount} Rollback for transaction with reference ID ${txn_ref_id}`, txn_type: 2
        }
    }
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

module.exports = { generateRandomString, generateRandomUserId, generateUUID , generateUUIDv7, getWebhookUrl, createOptions}