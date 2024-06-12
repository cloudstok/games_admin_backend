const express = require('express');
const cors = require('cors');
const { operatorRouter } = require('./routes/operator-route');
const { serviceRouter } = require('./routes/service-route');
const { deleteRedis } = require('./redis/connection');
const app = express()
require('dotenv').config();
// (async()=>await deleteRedis("users"))()
const PORT = process.env.PORT || 4100
app.use(cors());
app.use(express.json())
app.use('/operator', operatorRouter);
app.use('/service' , serviceRouter);
app.listen(PORT , ()=>console.log(`server listening at http://localhost:${PORT}`))