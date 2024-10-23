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
const { addAgent, agentList, agentChangePassword, deleteAgent } = require('../controller/service/agent');
const { addAdmin, adminList, adminChangePassword, deleteAdmin } = require('../controller/service/admin');
const { loadConfigTOAPI } = require('../utilities/load-config');


//Service Panel routes
serviceRouter.post('/register/user', verifyToken,  auth(['admin' , 'operator', 'superadmin']) , register);
serviceRouter.post('/user/login', login);
serviceRouter.get('/active/user', activeUser);
serviceRouter.get('/operators/list', verifyToken, auth(['admin' , 'agent', 'superadmin']), getOperatorList);
serviceRouter.post('/register/game', verifyToken, auth(['admin' , 'operator', 'superadmin']) ,  serviceAddGame)
serviceRouter.get('/games/list', verifyToken, auth(['admin' , 'operator' , 'agent', 'superadmin']), getMasterListGames);
serviceRouter.get('/game/operator/:operator_id', verifyToken, auth(['admin' , 'operator', 'superadmin']), getOperatorGamesForService);
serviceRouter.post('/register/operator/game', verifyToken, auth(['admin' , 'operator', 'superadmin']), addGameForOperator);
serviceRouter.get('/game/url', auth(['admin' , 'operator', 'superadmin']), getGameURL);

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
serviceRouter.get('/bets', auth(['admin' , 'agent', 'superadmin']) , bets)
serviceRouter.get('/transaction/detail',auth(['admin' , 'agent', 'superadmin']) ,getransaction);
// webhook
serviceRouter.post('/webhook',auth(['admin' , 'operator', 'superadmin']),  add_webhook);
serviceRouter.get('/webhook', auth(['admin' , 'operator', 'superadmin']), get_webhook);
serviceRouter.get('/webhook/:user_id',auth(['admin' , 'operator', 'superadmin']) , webhook);
serviceRouter.put('/webhook' ,auth(['admin' , 'operator', 'superadmin']) , update_webhook_url)


//rollback list
serviceRouter.get('/rollback/list', auth(['admin' , 'operator', 'superadmin']) , rollbacklist);
serviceRouter.post('/operator/rollback/:id', operatorRollback);
serviceRouter.post('/transaction/retry', auth(['admin' , 'operator', 'superadmin']) ,  retryTransaction);


// add admin
serviceRouter.post('/account/user' ,auth(['admin' , 'superadmin']) , addAdmin)
serviceRouter.get('/account/user' ,auth(['admin' , 'superadmin']) , adminList)
serviceRouter.delete('/account/user' ,auth(['admin' , 'superadmin']) , deleteAdmin)
serviceRouter.post('/account/user/change/password', auth(['agent' , 'admin', 'superadmin'])   , adminChangePassword)



// add agent
serviceRouter.post('/agent' ,auth(['admin' , 'superadmin']) , addAgent)
serviceRouter.get('/agent'  ,auth(['admin', 'superadmin']) , agentList)
serviceRouter.delete('/agent'  ,auth(['admin', 'superadmin']) , deleteAgent)
serviceRouter.post('/agent/change/password', auth(['agent' , 'admin', 'superadmin'])   , agentChangePassword)
// reporte 
serviceRouter.get('/mis/report', auth(['admin', 'superadmin']) , report)



//loadConfigTOAPI
serviceRouter.post('/loadconfig' , auth(['admin' , 'superadmin', 'superadmin']) , loadConfigTOAPI)

module.exports = { serviceRouter };
