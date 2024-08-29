//const { addGame, findGame } = require('../controller/service/game');
const { register, login, userLogin, getOperatorList } = require('../controller/service/operator');
const { serviceAddGame, serviceFindGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator, getGameURL } = require('../controller/service/game');
const { addGame, findGame, getGameFromServiceProvider } = require('../controller/operator/game');
const { getUserBalance, updateUserBalance } = require('../controller/service/wallet');
const { verifyToken, auth } = require('../utilities/jwt/jsonwebtoken');
const { activeUser, getUserDetail } = require('../controller/service/user');
const { getransaction, rollbacklist } = require('../controller/service/transaction');
const serviceRouter = require('express').Router();
const { add_webhook, get_webhook, webhook, update_webhook_url } = require('../controller/service/webhook');
const { bets, manualCashoutOrRollback, operatorRollback } = require('../controller/service/bets');


//Service Panel routes
serviceRouter.post('/register/user', verifyToken,  auth(['admin' , 'operator']) , register);
serviceRouter.post('/user/login', login);
serviceRouter.get('/active/user', activeUser);
serviceRouter.get('/operators/list', verifyToken, auth(['admin' , 'operator']), getOperatorList);
serviceRouter.post('/register/game', verifyToken, auth(['admin' , 'operator']) ,  serviceAddGame)
serviceRouter.get('/games/list', verifyToken, auth(['admin' , 'operator']), getMasterListGames);
serviceRouter.get('/game/operator/:operator_id', verifyToken, auth(['admin' , 'operator']), getOperatorGamesForService);
serviceRouter.post('/register/operator/game', verifyToken, auth(['admin' , 'operator']), addGameForOperator);
serviceRouter.get('/game/url', auth(['admin' , 'operator']), getGameURL);

//Call from Operator's API
serviceRouter.get('/operator/game',  getOperatorGame);
serviceRouter.post('/user/login/:id', userLogin);

//Call to Operator's API
serviceRouter.get('/operator/user/balance', getUserBalance);//
serviceRouter.post('/operator/user/balance', updateUserBalance);
serviceRouter.get('/user/detail', getUserDetail);
// bets 
serviceRouter.get('/bets', auth(['admin' , 'operator']) , bets)
serviceRouter.get('/transaction/detail',auth(['admin']) ,getransaction);
// webhook
serviceRouter.post('/webhook',auth(['admin' , 'operator']),  add_webhook);
serviceRouter.get('/webhook', auth(['admin' , 'operator']), get_webhook);
serviceRouter.get('/webhook/:user_id',auth(['admin' , 'operator']) , webhook);
serviceRouter.put('/webhook' ,auth(['admin' , 'operator']) , update_webhook_url)


//rollback list
serviceRouter.get('/rollback/list', auth(['admin' , 'operator']) , rollbacklist);
serviceRouter.post('/operator/rollback', operatorRollback);
serviceRouter.post('/manual/rollback',auth(['admin' , 'operator']) ,  manualCashoutOrRollback);


module.exports = { serviceRouter };
