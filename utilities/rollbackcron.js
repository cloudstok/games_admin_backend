const axios = require('axios');
const cron = require('node-cron');
const { read } = require('../db_config/db');

const getQuery = "SELECT id, game_url, options, retry, trx_status FROM pending_transactions WHERE trx_status = 1 AND retry < 11";
const updateQuery = "UPDATE pending_transactions SET retry = retry + 1, trx_status = ? WHERE id = ?";



const getRollbackDetail = async () => {
  try {
    const [data] = await read.query(getQuery);
    return data;
  } catch (err) {
    console.error('Error fetching rollback details:', err);
    return [];
  }
};

const updateRollbackDetail = async (status, id) => {
  try {
    const [data] = await read.query(updateQuery, [status, id]);
    return data;
  } catch (err) {
    console.error('Error updating rollback detail:', err);
  }
};

const processRollbackDetail = async (x) => {
  try {
    const check = await axios(x.options);
    if (check.status === 200) {
      await updateRollbackDetail(2, x.id);
      // Send message to game
    } else {
      if (x.retry === 10) {
        await updateRollbackDetail(0, x.id);
        // Send message to game
      } else {
        await updateRollbackDetail(1, x.id);
      }
    }
  } catch (err) {
    console.error('Error processing rollback detail:', err);
    await updateRollbackDetail(1, x.id); // Increment retry if error occurs
  }
};

const processRollbackDetails = async () => {
  const data = await getRollbackDetail();
  await Promise.all(data.map(processRollbackDetail));
};

// Schedule a cron job to run every 10 seconds
cron.schedule('*/10 * * * * *', async () => {
  console.log('Running task every 10 seconds');
  await processRollbackDetails();
});
