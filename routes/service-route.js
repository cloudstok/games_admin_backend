
const { register, login, userLogin, getOperatorList, updateGameStatus, updateOperatorDetails, updateOperatorStatus } = require('../controller/service/operator');
const { serviceAddGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator, serviceUpdateGame, getGameDetails, getAllGameDetails } = require('../controller/service/game');
const { getUserBalance, updateUserBalance, updateUserBalanceV2 } = require('../controller/service/wallet');
const { verifyToken, auth } = require('../utilities/jsonwebtoken');
const { activeUser, getUserDetail, getuserDataFromredis } = require('../controller/service/user');
const { getransaction, rollbacklist, getransactionbyuser, voidBet } = require('../controller/service/transaction');
const serviceRouter = require('express').Router();
const { add_webhook, get_webhook, webhook, update_webhook_url } = require('../controller/service/webhook');
const { bets, retryTransaction, operatorRollback, report } = require('../controller/service/bets');
const { addAgent, agentList, agentChangePassword, deleteAgent, resetAgentPassword } = require('../controller/service/agent');
const { addAdmin, adminList, adminChangePassword, deleteAdmin } = require('../controller/service/admin');
const { loadConfigTOAPI } = require('../utilities/load-config');
const { getGeameWebhook, addGeameWebhook, update_webhook } = require('../controller/operator/game');
const { upload } = require('../utilities/file_upload');


//Service Panel routes
serviceRouter.post('/register/user', verifyToken, auth(['admin', 'operator', 'superadmin']), register);
serviceRouter.post('/update/operator', verifyToken, auth(['admin', 'superadmin']), updateOperatorDetails);
serviceRouter.post('/operator/updatestatus', verifyToken, auth(['admin', 'superadmin']), updateOperatorStatus);
serviceRouter.post('/updategamestatus', verifyToken, auth(['admin', 'superadmin']), updateGameStatus);
serviceRouter.post('/user/login', login);
serviceRouter.get('/active/user', activeUser);
serviceRouter.get('/operators/list', verifyToken, auth(['admin', 'agent', 'superadmin']), getOperatorList);
serviceRouter.post('/register/game', verifyToken, auth(['admin', 'operator', 'superadmin']), upload.array('docs', 1), serviceAddGame)
serviceRouter.post('/update/register/game', verifyToken, auth(['admin', 'operator', 'superadmin']), upload.array('docs', 1), serviceUpdateGame)
serviceRouter.get('/games/list', verifyToken, auth(['admin', 'operator', 'agent', 'superadmin']), getMasterListGames);
serviceRouter.get('/game/operator/:operator_id', verifyToken, auth(['admin', 'operator', 'superadmin']), getOperatorGamesForService);
serviceRouter.post('/register/operator/game', verifyToken, auth(['admin', 'operator', 'superadmin']), addGameForOperator);

//Call from Operator's API
serviceRouter.get('/operator/game', getOperatorGame);
serviceRouter.post('/user/login/:id', userLogin);

//Call to Operator's API
serviceRouter.get('/operator/user/balance', getUserBalance);//
serviceRouter.post('/operator/user/balance', updateUserBalance);
serviceRouter.get('/game/details/:game_code', getGameDetails);
serviceRouter.get('/all/games', getAllGameDetails);

//v2 API's
serviceRouter.post('/operator/user/balance/v2', updateUserBalanceV2);
serviceRouter.get('/user/detail', getUserDetail);

// bets 
serviceRouter.get('/bets', auth(['admin', 'agent', 'superadmin']), bets)
serviceRouter.get('/transaction/detail', auth(['admin', 'agent', 'superadmin']), getransaction);
serviceRouter.get('/user/transaction/detail', getransactionbyuser);

// webhook
serviceRouter.post('/webhook', auth(['admin', 'operator', 'superadmin']), add_webhook);
serviceRouter.get('/webhook', auth(['admin', 'operator', 'superadmin']), get_webhook);
serviceRouter.get('/webhook/:user_id', auth(['admin', 'operator', 'superadmin']), webhook);
serviceRouter.put('/webhook', auth(['admin', 'operator', 'superadmin']), update_webhook_url)

//rollback list
serviceRouter.get('/rollback/list', auth(['admin', 'operator', 'superadmin']), rollbacklist);
serviceRouter.post('/operator/rollback/:id', operatorRollback);
serviceRouter.post('/transaction/retry', auth(['admin', 'operator', 'superadmin']), retryTransaction);

// add admin
serviceRouter.post('/account/user', auth(['admin', 'superadmin']), addAdmin)
serviceRouter.get('/account/user', auth(['admin', 'superadmin']), adminList)
serviceRouter.delete('/account/user', auth(['admin', 'superadmin']), deleteAdmin)
serviceRouter.post('/account/user/change/password', auth(['agent', 'admin', 'superadmin']), adminChangePassword)

// add agent
serviceRouter.post('/agent', auth(['admin', 'superadmin']), addAgent)
serviceRouter.get('/agent', auth(['admin', 'superadmin']), agentList)
serviceRouter.delete('/agent', auth(['admin', 'superadmin']), deleteAgent)
serviceRouter.post('/agent/change/password', auth(['agent', 'admin', 'superadmin']), agentChangePassword);
serviceRouter.post('/agent/reset/password', verifyToken, auth(['admin', 'superadmin']), resetAgentPassword);

// report
serviceRouter.get('/mis/report', auth(['admin', 'superadmin']), report)
serviceRouter.get('/get/game/webhook', getGeameWebhook)
serviceRouter.post('/add/game/webhook', addGeameWebhook)
serviceRouter.put('/update/game/webhook', update_webhook)

//loadConfigTOAPI
serviceRouter.post('/loadconfig', auth(['admin', 'superadmin', 'superadmin']), loadConfigTOAPI)

//Void Bet
serviceRouter.post('/void/bet', verifyToken, auth(['admin', 'superadmin']), voidBet);

module.exports = { serviceRouter };
