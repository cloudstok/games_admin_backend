const { removeNullValues } = require('../../utilities/common_function');
const { read, write } = require('../../utilities/db-connection');
const { getRedis, setRedis } = require('../../utilities/redis-connection');

//Logging Hourly Stats to Database
const logStatsToDb = async (data) => {

    try {
        const bulkInsertData = [];
        for (const stats of data) {
            const { operator_id, total_bet_amount, total_win_amount, total_rollback_amount, game_id, active_users, total_bets } = stats;
            const RTP = total_bet_amount > 0 ? (((total_win_amount + total_rollback_amount) / total_bet_amount) * 100).toFixed(2) : 0.00;
            bulkInsertData.push([operator_id, total_bet_amount, (total_win_amount + total_rollback_amount), RTP, game_id, total_bets, active_users]);
        }
        if (bulkInsertData.length > 0) {
            await insertHourlyStatsIntoDB(bulkInsertData);
        }
        res.status(200).json({ message: 'Data inserted successfully!' });
    } catch (err) {
        console.error('Error processing stats:', err);
        res.status(500).json({ error: 'Failed to process stats' });
    }
};

const insertHourlyStatsIntoDB = async (data) => {
    try {
        const placeholders = data.map(() => '(?, ?, ?, ?, ?, ? , ? )').join(','); // Create placeholders for each row
        const insertSQL = `
            INSERT INTO games_hourly_money_stats(
                operator_id, total_bet_amount, total_winnings, RTP, game_id , total_bets, active_users
            ) VALUES ${placeholders}
        `;
        const flatData = data.flat();
        await write(insertSQL, flatData);
    } catch (err) {
        console.error('Error inserting bulk data into the Database:', err);
    }
};

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
    await logStatsToDb(statsData);
    console.log(`Stats generated and stored successfully`);
};


//Get Stats from DB

const fetchReport = async (req, res) => {
    try {
        req.query = removeNullValues(req.query);
        const { start_date, end_date, number, unit, operator_id, game_id } = req.query;
        if (!validateParams(number, unit, start_date, end_date)) {
            return res.status(400).send({
                status: false,
                message: "Invalid or missing parameters. Please provide either 'number' and 'unit' or 'start_date' and 'end_date'."
            });
        }
        let cacheKey;
        if (start_date && end_date) {
            cacheKey = `c5-${start_date}-${end_date}-${operator_id}-${game_id}`;
        } else {
            cacheKey = `c5-${number}-${unit}-${operator_id}-${game_id}`;
        }
        let statsCache = await getRedis(cacheKey);
        if (!statsCache) {
            statsCache = JSON.parse(statsCache);
            return res.status(200).send({ status: true, msg: "data found", data: statsCache });
        } else {
            let sqlQuery;
            const queryParams = [];
            if (start_date && end_date) {
                sqlQuery = buildDailyStatsQuery(queryParams, start_date, end_date, operator_id, game_id);
            } else {
                const intervalValue = parseInt(number);
                const intervalUnit = unit.toUpperCase();
                sqlQuery = buildIntervalStatsQuery(intervalValue, intervalUnit, queryParams, operator_id, game_id);
            }
            const [statsData] = await read(sqlQuery, queryParams);
            if (cacheKey && statsData) {
                await setRedis(cacheKey, JSON.stringify(statsData), 3600); // Cache for 1 hour (3600 seconds)
            }
            console.log("2__>>", statsData);
            return res.status(200).send({ status: true, msg: "data found", data: statsData });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const validateParams = (number, unit, start_date, end_date) => {
    if ((!number || !unit) && (!start_date || !end_date)) {
        return false;
    }
    return true;
};

const buildDailyStatsQuery = (queryParams, start_date, end_date, operator_id, game_id) => {
    let sqlQuery = `
        SELECT 
            operator_id,
            game_id,
            SUM(CAST(total_bet_amount AS DECIMAL(20, 2))) AS total_bet_amount,
            SUM(CAST(total_winnings AS DECIMAL(20, 2))) AS total_winnings,
            SUM(total_bets) AS total_bets,
            AVG(active_users) AS active_users,
            AVG(CAST(rtp AS DECIMAL(5, 2))) AS average_rtp
        FROM 
            games_hourly_money_stats
        WHERE 
            created_at >= ? AND created_at <= ?  
    `;
    queryParams.push(start_date, end_date);
    if (operator_id && game_id) {
        sqlQuery += ` AND operator_id = ? AND game_id = ?`;
        queryParams.push(operator_id);
        queryParams.push(game_id);
        sqlQuery += ` GROUP BY operator_id`;
    }
    else if (operator_id) {
        sqlQuery += ` AND operator_id = ?`;
        queryParams.push(operator_id);
        sqlQuery += ` GROUP BY game_id`;
    }
    else if (game_id) {
        sqlQuery += ` AND game_id = ?`;
        queryParams.push(game_id);
        sqlQuery += ` GROUP BY operator_id`;
    }
    else sqlQuery += ` GROUP BY operator_id, game_id`;
    return sqlQuery;
};

const buildIntervalStatsQuery = (intervalValue, intervalUnit, queryParams, operator_id, game_id) => {
    let sqlQuery = `
        SELECT 
            operator_id,
            game_id,
            SUM(CAST(total_bet_amount AS DECIMAL(20, 2))) AS total_bet_amount,
            SUM(CAST(total_winnings AS DECIMAL(20, 2))) AS total_winnings,
            SUM(total_bets) AS total_bets,
            AVG(active_users) AS active_users,
            AVG(CAST(rtp AS DECIMAL(5, 2))) AS average_rtp
        FROM 
            games_hourly_money_stats
        WHERE 
            created_at >= (NOW() - INTERVAL ${intervalValue} ${intervalUnit})
    `;
    if (operator_id && game_id) {
        sqlQuery += ` AND operator_id = ? AND game_id = ?`;
        queryParams.push(operator_id);
        queryParams.push(game_id);
        sqlQuery += ` GROUP BY operator_id`;
    }
    else if (operator_id) {
        sqlQuery += ` AND operator_id = ?`;
        queryParams.push(operator_id);
        sqlQuery += ` GROUP BY game_id`;
    }
    else if (game_id) {
        sqlQuery += ` AND game_id = ?`;
        queryParams.push(game_id);
        sqlQuery += ` GROUP BY operator_id`;
    }
    else sqlQuery += ` GROUP BY operator_id,game_id`;

    return sqlQuery;
};

module.exports = { storeHourlyStats, fetchReport };