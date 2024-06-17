//const { addGame, findGame } = require('../controller/service/game');
const { register, login, userLogin, getOperatorList } = require('../controller/service/operator');
const { serviceAddGame, serviceFindGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator } = require('../controller/service/game');
const { addGame, findGame, getGameFromServiceProvider } = require('../controller/operator/game');
const { getUserBalance, updateUserBalance } = require('../controller/service/wallet');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { activeUser, getuserDetail, getUserDetail } = require('../controller/service/user');
const { getransaction } = require('../controller/service/transaction');
const serviceRouter = require('express').Router();
const {add_webhook, get_webhook, webhook} = require('../controller/service/webhook')


//Service Panel routes
serviceRouter.post('/register/user', verifyToken, register);
serviceRouter.post('/user/login', login);
serviceRouter.get('/active/user', activeUser);
serviceRouter.get('/operators/list', verifyToken, getOperatorList);
serviceRouter.post('/register/game', verifyToken, serviceAddGame)
serviceRouter.get('/games/list', verifyToken, getMasterListGames);
serviceRouter.get('/game/operator/:operator_id', verifyToken, getOperatorGamesForService);
serviceRouter.post('/register/operator/game', verifyToken, addGameForOperator);

//Call from Operator's API
serviceRouter.get('/operator/game', getOperatorGame);
serviceRouter.post('/user/login/:id', userLogin);

//Call to Operator's API
serviceRouter.get('/operator/user/balance', getUserBalance);//
serviceRouter.post('/operator/user/balance', updateUserBalance);
serviceRouter.get('/user/detail', getUserDetail);




serviceRouter.get('/transaction/detail', getransaction);

// webhook
serviceRouter.post('/webhook', add_webhook);
serviceRouter.get('/webhook', get_webhook);
serviceRouter.get('/webhook/:user_id', webhook);

module.exports = { serviceRouter };