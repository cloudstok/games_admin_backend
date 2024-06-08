//const { addGame, findGame } = require('../controller/service/game');
const { register, login, userLogin } = require('../controller/service/operator');
const {  serviceAddGame, serviceFindGame, getOperatorGame } = require('../controller/service/game');
const { addGame, findGame } = require('../controller/operator/game');
const { getUserBalance, updateUserBalance } = require('../controller/service/wallet');

const serviceRouter = require('express').Router();

serviceRouter.post('/create/operator', register);
serviceRouter.post('/operator/login', login);
serviceRouter.post('/user/login/:id' , userLogin)
serviceRouter.post('/game' , serviceAddGame)
// serviceRouter.get('/game' , serviceFindGame)
serviceRouter.post('/operator/game' , addGame)
serviceRouter.get('/operator/game' , getOperatorGame);
serviceRouter.post('/operator/user/balance', getUserBalance);
serviceRouter.put('/operator/user/balance', updateUserBalance);
module.exports = { serviceRouter};