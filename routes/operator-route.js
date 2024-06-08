const { serviceAddGame, serviceFindGame } = require('../controller/service/game');
const { addUser, userLogin} = require('../controller/operator/user');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { addWallet, findWallet, userBalance, updateBalance } = require('../controller/operator/wallet');
const { findGame, getGameFromServiceProvider } = require('../controller/operator/game');
const operatorRouter = require('express').Router();
operatorRouter.post('/create/user', verifyToken, addUser);
operatorRouter.post('/user/login', verifyToken, userLogin)
operatorRouter.post('/game' , serviceAddGame)
operatorRouter.get('/game' , getGameFromServiceProvider)
operatorRouter.post('/wallet' , addWallet)
operatorRouter.get('/wallet/:user_id' , findWallet)
operatorRouter.post('/user/balance/:operator_id', userBalance);
operatorRouter.put('/user/balance/:operator_id', updateBalance);

module.exports = { operatorRouter};