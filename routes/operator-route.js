const { serviceAddGame } = require('../controller/service/game');
const { addUser, userLogin, getUser, getuserDetail } = require('../controller/operator/user');
const { verifyToken, auth } = require('../utilities/jsonwebtoken');
const { addWallet, findWallet, userBalance, updateBalance, AllWallet } = require('../controller/operator/wallet');
const { operatorFindGame, getGeame, operatorGameByOperatorId, operatorGameCodes } = require('../controller/operator/game');
const { logout } = require('../controller/service/user');
const { changePassword, OperatorchangePassword } = require('../controller/service/operator');
const { rollbackCredit } = require('../controller/operator/bets');
const operatorRouter = require('express').Router();
operatorRouter.post('/create/user', auth(['admin' , 'operator', 'superadmin']) , verifyToken, addUser);
operatorRouter.post('/user/login', userLogin)
operatorRouter.post('/game', auth(['admin' , 'operator', 'superadmin']) , serviceAddGame)
operatorRouter.post('/wallet', auth(['admin' , 'operator', 'superadmin']) , addWallet)
operatorRouter.get('/wallet/:user_id', auth(['admin' , 'operator', 'superadmin']), findWallet)
operatorRouter.get('/wallet', auth(['admin' , 'operator', 'superadmin']) , AllWallet)
operatorRouter.get('/user/balance', userBalance);
operatorRouter.post('/user/balance', updateBalance);
operatorRouter.get('/games/list', operatorFindGame);
operatorRouter.get('/games/code', operatorGameCodes);
operatorRouter.get('/games/:operator_id', operatorGameByOperatorId);
operatorRouter.get('/user/list', auth(['admin' , 'operator', 'superadmin']) ,  getUser);
operatorRouter.get('/user/logout', logout);
operatorRouter.get('/user/detail', getuserDetail);
operatorRouter.get('/game/detail',auth(['admin' , 'operator', 'superadmin']), getGeame);
operatorRouter.post('/user/change/password', changePassword); // user change Password
operatorRouter.post('/change/password', verifyToken , auth(['admin' , 'operator', 'superadmin']) , OperatorchangePassword);  // operator change Password
operatorRouter.post('/transaction/rollback',auth(['admin' , 'operator', 'superadmin']) , rollbackCredit);

module.exports = { operatorRouter };