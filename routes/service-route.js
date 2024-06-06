//const { addGame, findGame } = require('../controller/service/game');
const { register, login, userLogin } = require('../controller/service/operator');
const {  serviceAddGame, serviceFindGame } = require('../controller/service/game');
const { addGame, findGame } = require('../controller/operator/game');
const { getUserBalance } = require('../controller/service/wallet');

const serviceRouter = require('express').Router();

serviceRouter.post('/create/operator', register);
serviceRouter.post('/operator/login', login);
serviceRouter.post('/user/login/:id' , userLogin)
serviceRouter.post('/game' , serviceAddGame)
serviceRouter.get('/game' , serviceFindGame)
serviceRouter.post('/operator/game' , addGame)
serviceRouter.get('/operator/game' , findGame)
serviceRouter.post('/operator/user/balance', getUserBalance);

module.exports = { serviceRouter};