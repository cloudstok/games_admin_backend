//const { addGame, findGame } = require('../controller/service/game');
const { register, login, userLogin, getOperatorList } = require('../controller/service/operator');
const {  serviceAddGame, serviceFindGame, getOperatorGame, getMasterListGames, getOperatorGamesForService, addGameForOperator } = require('../controller/service/game');
const { addGame, findGame, getGameFromServiceProvider } = require('../controller/operator/game');
const { getUserBalance, updateUserBalance } = require('../controller/service/wallet');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const { activeUser } = require('../controller/service/user');

const serviceRouter = require('express').Router();


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
serviceRouter.get('/operator/game' , getOperatorGame);
serviceRouter.post('/user/login/:id' , userLogin);

//Call to Operator's API
serviceRouter.post('/operator/user/balance', getUserBalance);
serviceRouter.put('/operator/user/balance', updateUserBalance);

module.exports = { serviceRouter};