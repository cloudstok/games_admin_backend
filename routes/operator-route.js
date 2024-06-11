const { serviceAddGame, serviceFindGame } = require('../controller/service/game');
const { addUser, userLogin, getUser } = require('../controller/operator/user');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { addWallet, findWallet, userBalance, updateBalance, AllWallet } = require('../controller/operator/wallet');
const { operatorFindGame } = require('../controller/operator/game');
const operatorRouter = require('express').Router();
operatorRouter.post('/create/user', verifyToken, addUser);
operatorRouter.post('/user/login', userLogin)
operatorRouter.post('/game', serviceAddGame)
operatorRouter.post('/wallet', addWallet)
operatorRouter.get('/wallet/:user_id', findWallet)
operatorRouter.get('/wallet', AllWallet)
operatorRouter.post('/user/balance/:operator_id', userBalance);
operatorRouter.put('/user/balance/:operator_id', updateBalance);
operatorRouter.get('/games/list', operatorFindGame);
operatorRouter.get('/user/list', getUser);

module.exports = { operatorRouter };