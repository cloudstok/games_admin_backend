const { addGame, findGame } = require('../controller/operator/game');
const { addUser} = require('../controller/operator/user');

const serviceRouter = require('express').Router();

// serviceRouter.post('/create/user', addUser);
serviceRouter.post('/game' , addGame)
// serviceRouter.get('/game' , findGame)


module.exports = { serviceRouter};