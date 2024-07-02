const { serviceAddGame } = require('../controller/service/game');
const { addUser, userLogin, getUser, getuserDetail } = require('../controller/operator/user');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { addWallet, findWallet, userBalance, updateBalance, AllWallet } = require('../controller/operator/wallet');
const { operatorFindGame, getGeame } = require('../controller/operator/game');
const { logout } = require('../controller/service/user');
const operatorRouter = require('express').Router();
operatorRouter.post('/create/user', verifyToken, addUser);
operatorRouter.post('/user/login', userLogin)
operatorRouter.post('/game', serviceAddGame)
operatorRouter.post('/wallet', addWallet)
operatorRouter.get('/wallet/:user_id', findWallet)
operatorRouter.get('/wallet', AllWallet)
operatorRouter.get('/user/balance', userBalance);
operatorRouter.post('/user/balance', updateBalance);
operatorRouter.get('/games/list', operatorFindGame);
operatorRouter.get('/user/list', getUser);
operatorRouter.get('/user/logout', logout);
operatorRouter.get('/user/detail', getuserDetail);
operatorRouter.get('/game/detail', getGeame);


module.exports = { operatorRouter };