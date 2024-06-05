const { addUser} = require('../controller/operator/user');

const operatorRouter = require('express').Router();

operatorRouter.post('/create/user', addUser);

module.exports = { operatorRouter};