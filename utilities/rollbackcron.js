const axios = require('axios');
const cron = require('node-cron');
const { read } = require('../db_config/db');

const getQuery = "SELECT id, backend_base_url, options, retry, status FROM pending_transactions WHERE status = '1' AND retry < 10";
const updateQuery = "UPDATE pending_transactions SET retry = retry + ?, status = ? WHERE id = ?";



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
    const [data] = await read.query(updateQuery, [1 , status, id]);
    // console.log(data)
    console.log({status, id})
    return data;
  } catch (err) {
    console.error('Error updating rollback detail:', err);
  }
};

const processRollbackDetail = async (x) => {
  try {
    const check = await axios(x.options);
    console.log(check.status)
    if (check.status == 200) {
     return await updateRollbackDetail('2', x.id);
      // Send message to game
    } else {
      if (x.retry == 10) {
     return  await updateRollbackDetail( '0', x.id);
        // Send message to game
      } else {
      return await updateRollbackDetail( '1', x.id);
      }
    }
  } catch (err) {
    console.error('Error processing rollback detail:', err);
   return await updateRollbackDetail(1, x.id); // Increment retry if error occurs
  }
};

const processRollbackDetails = async () => {
  const data = await getRollbackDetail();
  if(data.length > 0){
    await Promise.all(data.map(processRollbackDetail));
  }
  // console.log(data)

};

// Schedule a cron job to run every 10 seconds
// cron.schedule('*/10 * * * * *', async () => {
//   console.log('Running task every 10 seconds');
//   await processRollbackDetails();
// });


const rollback = async(req, res)=>{
  try{
    const {id} = req.query
console.log(id , "id")

    let [[rollback]] =   await read.query("SELECT id, backend_base_url, options, retry, status FROM pending_transactions WHERE  id = ?", [id]) 

   processRollbackDetail(rollback)

   return res.status(200).send({status : true , msg : "request send"})
  
  }catch(er){
    console.error(er);
  }
}


module.exports = {
  rollback
}