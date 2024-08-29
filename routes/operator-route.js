const { serviceAddGame } = require('../controller/service/game');
const { addUser, userLogin, getUser, getuserDetail } = require('../controller/operator/user');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { addWallet, findWallet, userBalance, updateBalance, AllWallet } = require('../controller/operator/wallet');
const { operatorFindGame, getGeame } = require('../controller/operator/game');
const { logout } = require('../controller/service/user');
const { changePassword, OperatorchangePassword } = require('../controller/service/operator');
const { rollbackCredit } = require('../controller/operator/bets');
const operatorRouter = require('express').Router();
operatorRouter.post('/create/user', auth(['admin' , 'operator']) , verifyToken, addUser);
operatorRouter.post('/user/login', userLogin)
operatorRouter.post('/game', auth(['admin' , 'operator']) , serviceAddGame)
operatorRouter.post('/wallet', auth(['admin' , 'operator']) , addWallet)
operatorRouter.get('/wallet/:user_id', auth(['admin' , 'operator']), findWallet)
operatorRouter.get('/wallet', auth(['admin' , 'operator']) , AllWallet)
operatorRouter.get('/user/balance', userBalance);
operatorRouter.post('/user/balance', updateBalance);
operatorRouter.get('/games/list', operatorFindGame);
operatorRouter.get('/user/list', auth(['admin' , 'operator']) ,  getUser);
operatorRouter.get('/user/logout', logout);
operatorRouter.get('/user/detail', getuserDetail);
operatorRouter.get('/game/detail',auth(['admin' , 'operator']), getGeame);
operatorRouter.post('/user/change/password', auth(['admin' , 'operator']) , changePassword); // user change Password
operatorRouter.post('/change/password', verifyToken , auth(['admin' , 'operator']) , OperatorchangePassword);  // operator change Password
operatorRouter.post('/transaction/rollback',auth(['admin' , 'operator']) , rollbackCredit);

module.exports = { operatorRouter };