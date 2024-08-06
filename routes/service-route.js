//const { addGame, findGame } = require('../controller/service/game');
const { register, login, userLogin, getOperatorList } = require('../controller/service/operator');
const { serviceAddGame, serviceFindGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator, getGameURL } = require('../controller/service/game');
const { addGame, findGame, getGameFromServiceProvider } = require('../controller/operator/game');
const { getUserBalance, updateUserBalance } = require('../controller/service/wallet');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { activeUser, getUserDetail } = require('../controller/service/user');
const { getransaction, rollbacklist } = require('../controller/service/transaction');
const serviceRouter = require('express').Router();
const { add_webhook, get_webhook, webhook } = require('../controller/service/webhook');
const { bets, manualCashoutOrRollback, operatorRollback } = require('../controller/service/bets');


//Service Panel routes
serviceRouter.post('/register/user', verifyToken, register);
serviceRouter.post('/user/login', login);
serviceRouter.get('/active/user', activeUser);
serviceRouter.get('/operators/list', verifyToken, getOperatorList);
serviceRouter.post('/register/game', verifyToken, serviceAddGame)
serviceRouter.get('/games/list', verifyToken, getMasterListGames);
serviceRouter.get('/game/operator/:operator_id', verifyToken, getOperatorGamesForService);
serviceRouter.post('/register/operator/game', verifyToken, addGameForOperator);
serviceRouter.get('/game/url', getGameURL);


//Call from Operator's API
serviceRouter.get('/operator/game', getOperatorGame);
serviceRouter.post('/user/login/:id', userLogin);

//Call to Operator's API
serviceRouter.get('/operator/user/balance', getUserBalance);//
serviceRouter.post('/operator/user/balance', updateUserBalance);
serviceRouter.get('/user/detail', getUserDetail);
// bets 
serviceRouter.get('/bets', bets)
serviceRouter.get('/transaction/detail',auth(['admin']) ,getransaction);
// webhook
serviceRouter.post('/webhook', add_webhook);
serviceRouter.get('/webhook', get_webhook);
serviceRouter.get('/webhook/:user_id', webhook);



//rollback list
serviceRouter.get('/rollback/list', rollbacklist);
serviceRouter.post('/operator/rollback', operatorRollback);
serviceRouter.post('/manual/rollback', manualCashoutOrRollback);


module.exports = { serviceRouter };