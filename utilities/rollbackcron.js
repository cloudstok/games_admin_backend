const axios = require('axios');
const cron = require('node-cron');
const { read } = require('../db_config/db');

const getQuery = "SELECT id, backend_base_url, options, retry, status FROM pending_transactions WHERE status = '1' AND retry < 10";
const updateQuery = "UPDATE pending_transactions SET retry = retry + ?, status = ? WHERE id = ?";

const rollback = async(req, res)=>{
  try{
    const {id} = req.query

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