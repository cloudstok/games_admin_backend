const cron = require('node-cron');
const { storeDataStats } = require('./common_function');

const storeHourlyStats = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('Running storeHourlyStats function at the start of every hour');
        try {
            await storeDataStats('GAME', 'HOUR');
            await storeDataStats('USER', 'HOUR');
            console.log('storeHourlyStats executed successfully');
        } catch (error) {
            console.error('Error executing storeHourlyStats:', error);
        }
    });
};

const storeDailyStats = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('Running storeHourlyStats function at the start of every hour');
        try {
            await storeDataStats('GAME', 'DAY');
            await storeDataStats('USER', 'DAY');
            console.log('storeDailyStats executed successfully');
        } catch (error) {
            console.error('Error executing storeHourlyStats:', error);
        }
    });
};

const registerCron = () => {
    storeHourlyStats();
    storeDailyStats();
}

module.exports = { registerCron };