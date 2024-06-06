const { serviceAddGame, serviceFindGame } = require('../controller/service/game');
const { addUser, userLogin} = require('../controller/operator/user');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { addWallet, findWallet, userBalance, updateBalance } = require('../controller/operator/wallet');
const operatorRouter = require('express').Router();
operatorRouter.post('/create/user', verifyToken, addUser);
operatorRouter.post('/user/login', verifyToken, userLogin)
operatorRouter.post('/game' , serviceAddGame)
operatorRouter.get('/game' , serviceFindGame)
operatorRouter.post('/wallet' , addWallet)
operatorRouter.get('/wallet' , findWallet)
operatorRouter.post('/user/balance/:operator_id', userBalance);
operatorRouter.put('/user/balance/:operator_id', updateBalance);

module.exports = { operatorRouter};