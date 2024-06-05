const express = require('express');
const cors = require('cors');
const { routes } = require('./routes');
const app = express()
require('dotenv').config();

const PORT = process.env.PORT || 4100
app.use(cors());
app.use(express.json())
app.use(routes)

app.listen(PORT , ()=>console.log(`server listening at http://localhost:${PORT}`))