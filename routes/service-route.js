//const { addGame, findGame } = require('../controller/service/game');
const { addUser} = require('../controller/operator/user');
const { register, login, userLogin } = require('../controller/service/operator');
const { addGame, findGame } = require('../controller/operator/game');

const serviceRouter = require('express').Router();

serviceRouter.post('/create/operator', register);
serviceRouter.post('/operator/login', login);
serviceRouter.post('/user/login/:id' , userLogin)
serviceRouter.post('/game' , addGame)
serviceRouter.get('/game' , findGame)

module.exports = { serviceRouter};