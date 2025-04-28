const crypto = require('crypto');
const { variableConfig } = require('./load-config');
const { encryption } = require('./ecryption-decryption');
const axios = require('axios');
const { read } = require('./db-connection');
const pm2 = require('pm2');

function restartQueues() {
    pm2.connect((err) => {
        if (err) {
            console.error('Error connecting to PM2:', err);
            process.exit(2);
        }
        pm2.restart('rabbitmq-consumer', (err, proc) => {
            pm2.disconnect();

            if (err) {
                console.error('Error restarting process:', err);
            } else {
                console.log('Process restarted successfully:', proc);
            }
        })
    })
}

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

const getWebhookUrl = async (user_id, event_name) => {
    try {
        const webhookUrl = (variableConfig.webhook_data.find(e => e.user_id === user_id && e.event === event_name))?.webhook_url || false;
        return webhookUrl;
    } catch (err) {
        return err;
    }
}

const getRollbackOptions = async (data) => {
    const txn_type = 2;
    const { amount, txn_id, ip, game_id, user_id, game_code, secret, operatorUrl, token } = data;
    const trx_id = await generateUUIDv7();
    const description = `${amount} Rollback-ed for transaction with reference ID ${txn_id}`
    let encryptedData;
    try {
        encryptedData = await encryption({ amount, txn_id: trx_id, txn_ref_id: txn_id, description, txn_type, ip, game_id, user_id, game_code }, secret);
    } catch (err) {
        return;
    }
    const postOptions = {
        method: 'POST',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token,
            'x-user-id': user_id
        },
        timeout: 1000 * 10,
        data: { data: encryptedData }
    };
    const dbData = { txn_id: trx_id, description, txn_ref_id: txn_id, txn_type, amount, game_id, user_id, token, operatorId: data.operatorId };
    return { options: postOptions, dbData };
}

const getTransactionOptions = async (data) => {
    const txn_type = 1;
    const { amount, txn_id, txn_ref_id, ip, game_id, user_id, operatorId, token, description } = data;
    const game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;

    if (!game_code) {
        return;
    }

    const operatorData = variableConfig.operator_data.find(e => e.user_id == operatorId);
    if (!operatorData) return res.status(400).send({ status: false, msg: `Operator not found for this transaction` })

    let encryptedData;

    try {
        encryptedData = await encryption({ amount, txn_id, txn_ref_id, description, txn_type, ip, game_id, user_id, game_code }, operatorData.secret);
    } catch (err) {
        return err;
    }

    let operatorUrl;

    try {
        operatorUrl = await getWebhookUrl(operatorId, "UPDATE_BALANCE");
    } catch (err) {
        return;
    }

    if (!operatorUrl) {
        return false;
    }

    const postOptions = {
        method: 'POST',
        url: operatorUrl,
        headers: {
            'Content-Type': 'application/json',
            token,
            'x-user-id': user_id
        },
        timeout: 1000 * 10,
        data: { data: encryptedData }
    };

    const dbData = { txn_id, description, txn_ref_id, txn_type, amount, game_id, user_id, token, operatorId, secret: operatorData.secret, operatorUrl, game_code, ip };
    return { options: postOptions, dbData };
}

const getDebitTransaction = async (txn_ref_id) => {
    const [debitTransaction] = await read(`SELECT * FROM transaction WHERE txn_id = ? LIMIT 1`, [txn_ref_id]);
    return debitTransaction[0];
}

const getTransactionForRollback = async (data) => {
    try {
        const { amount, txn_id, txn_ref_id, ip, game_id, user_id, operator_id, txn_type, session_token, description } = data;
        const game_code = (variableConfig.games_masters_list.find(e => e.game_id == game_id))?.game_code || null;
        if (!game_code) {
            return false;
        }
        const trx_id = await generateUUIDv7();
        const trx_ref_id = txn_type == '0' ? txn_id : txn_ref_id;
        const debitTransaction = txn_type == '1' ? await getDebitTransaction(txn_ref_id) : {};
        let txn_decription = txn_type == '0' ? description : debitTransaction?.description;
        txn_decription = txn_decription.replace('debited', 'rollback-ed');
        const txn_amount = txn_type == '0' ? amount : debitTransaction?.amount;

        const operatorData = variableConfig.operator_data.find(e => e.user_id == operator_id);
        if (!operatorData) return res.status(400).send({ status: false, msg: `Operator not found for this transaction` })

        let encryptedData;

        try {
            encryptedData = await encryption({ amount: txn_amount, txn_id: trx_id, txn_ref_id: trx_ref_id, description: txn_decription, txn_type: 2, ip, game_id, user_id, game_code }, operatorData.secret);
        } catch (err) {
            return err;
        }

        let operatorUrl;

        try {
            operatorUrl = await getWebhookUrl(operator_id, "UPDATE_BALANCE");
        } catch (err) {
            return;
        }

        if (!operatorUrl) return false;


        const postOptions = {
            method: 'POST',
            url: operatorUrl,
            headers: {
                'Content-Type': 'application/json',
                token: session_token
            },
            timeout: 1000 * 3,
            data: { data: encryptedData }
        };

        const dbData = { txn_id: trx_id, description: txn_decription, txn_ref_id: trx_ref_id, txn_type: 2, amount: txn_amount, game_id, user_id, token: session_token, operatorId: operator_id };
        return { options: postOptions, dbData };
    } catch (err) {
        console.log(err);
        return false
    }

}


const createOptions = (url, options) => {
    let token = options.token;
    let clientServerOptions = {
        url,
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            token
        },
        data: {
            data: options
        }
    }
    return clientServerOptions
}

async function getHourlyStats() {
    try {
        const StatsSQL = `SELECT game_id, operator_id,
    SUM(CASE WHEN txn_type = '0' and txn_status = '2' THEN amount ELSE 0 END) AS total_bet_amount,
    SUM(CASE WHEN txn_type = '1' and txn_status = '2' THEN amount ELSE 0 END) AS total_win_amount,
    SUM(CASE WHEN txn_type = '2' and txn_status = '2' THEN amount ELSE 0 END) AS total_rollback_amount,
    COUNT(DISTINCT CASE WHEN txn_ref_id IS NULL THEN txn_id END) as total_bets,
    count(distinct user_id) as active_users
FROM transaction WHERE created_at >= (NOW() - INTERVAL 1 HOUR)  GROUP BY game_id, operator_id`;
        const [statsData] = await read(StatsSQL);
        return statsData;
    } catch (err) {
        console.error(`Err while generating stats is::`, err);
        return false;
    }
};

async function storeHourlyStats() {
    const statsData = await getHourlyStats();
    const url = process.env.STATS_BASE_URL + '/games/mis/report';
    const options = {
        'url': url,
        'Content-Type': 'application/json',
        'method': 'POST',
        'data': statsData
    };

    try {
        await axios(options);
        console.log(`Stats generated and stored successfully`);
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
};

const getLobbyFromDescription = (line) => {
    const parts = line.trim().split(' ');
    return parts[parts.length - 1];
}


function validateSlug(slug, gameName) {
    const cleanGameName = gameName.replace(/\s+/g, '').toLowerCase();
    const cleanSlug = slug.replace(/\s+/g, '').toLowerCase();

    if (cleanGameName.length < 7) return cleanSlug.includes(cleanGameName);
    else {
        let seqIndex = 0;

        for (let i = 0; i < cleanSlug.length; i++) {
            if (cleanSlug[i] === cleanGameName[seqIndex]) {
                seqIndex++;
            }
            if (seqIndex === cleanGameName.length) break;
        }

        let slugIndex = 0, nameIndex = 0;
        while (slugIndex < cleanSlug.length && nameIndex < cleanGameName.length) {
            if (cleanSlug[slugIndex] === cleanGameName[nameIndex]) {
                slugIndex++;
            }
            nameIndex++;
        }
        return slugIndex === cleanSlug.length;
    }
}


module.exports = { validateSlug, generateRandomString, generateRandomUserId, generateUUID, generateUUIDv7, getWebhookUrl, createOptions, getRollbackOptions, getTransactionOptions, storeHourlyStats, getTransactionForRollback, getLobbyFromDescription, restartQueues }