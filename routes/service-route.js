//const { addGame, findGame } = require('../controller/service/game');
const { register, login, userLogin, getOperatorList } = require('../controller/service/operator');
const { serviceAddGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator, getGameURL } = require('../controller/service/game');
const { getUserBalance, updateUserBalance, updateUserBalanceV2 } = require('../controller/service/wallet');
const { verifyToken, auth } = require('../utilities/jsonwebtoken');
const { activeUser, getUserDetail, getuserDataFromredis } = require('../controller/service/user');
const { getransaction, rollbacklist } = require('../controller/service/transaction');
const serviceRouter = require('express').Router();
const { add_webhook, get_webhook, webhook, update_webhook_url } = require('../controller/service/webhook');
const { bets, retryTransaction, operatorRollback, report } = require('../controller/service/bets');
const { addAgent, agentList, agentChangePassword } = require('../controller/service/agent');


//Service Panel routes
serviceRouter.post('/register/user', verifyToken,  auth(['admin' , 'operator']) , register);
serviceRouter.post('/user/login', login);
serviceRouter.get('/active/user', activeUser);
serviceRouter.get('/operators/list', verifyToken, auth(['admin' , 'agent']), getOperatorList);
serviceRouter.post('/register/game', verifyToken, auth(['admin' , 'operator']) ,  serviceAddGame)
serviceRouter.get('/games/list', verifyToken, auth(['admin' , 'operator' , 'agent']), getMasterListGames);
serviceRouter.get('/game/operator/:operator_id', verifyToken, auth(['admin' , 'operator']), getOperatorGamesForService);
serviceRouter.post('/register/operator/game', verifyToken, auth(['admin' , 'operator']), addGameForOperator);
serviceRouter.get('/game/url', auth(['admin' , 'operator']), getGameURL);

//Call from Operator's API
serviceRouter.get('/operator/game',  getOperatorGame);
serviceRouter.post('/user/login/:id', userLogin);

//Call to Operator's API
serviceRouter.get('/operator/user/balance', getUserBalance);//
serviceRouter.post('/operator/user/balance', updateUserBalance);
//v2 API's
serviceRouter.post('/operator/user/balance/v2', updateUserBalanceV2);
serviceRouter.get('/user/detail', getUserDetail);
serviceRouter.get('/user', getuserDataFromredis);
// bets 
serviceRouter.get('/bets', auth(['admin' , 'agent']) , bets)
serviceRouter.get('/transaction/detail',auth(['admin' , 'agent']) ,getransaction);
// webhook
serviceRouter.post('/webhook',auth(['admin' , 'operator']),  add_webhook);
serviceRouter.get('/webhook', auth(['admin' , 'operator']), get_webhook);
serviceRouter.get('/webhook/:user_id',auth(['admin' , 'operator']) , webhook);
serviceRouter.put('/webhook' ,auth(['admin' , 'operator']) , update_webhook_url)


//rollback list
serviceRouter.get('/rollback/list', auth(['admin' , 'operator']) , rollbacklist);
serviceRouter.post('/operator/rollback/:id', operatorRollback);
serviceRouter.post('/transaction/retry', auth(['admin' , 'operator']) ,  retryTransaction);

// add agent
serviceRouter.post('/agent' ,auth(['admin' ]) , addAgent)
serviceRouter.get('/agent'  ,auth(['admin']) , agentList)
//serviceRouter.post('/agent/login'   , agentlogin)
serviceRouter.post('/agent/change/password', auth(['agent' , 'admin'])   , agentChangePassword)
// reporte 
serviceRouter.get('/mis/report', auth(['admin']) , report)

module.exports = { serviceRouter };
