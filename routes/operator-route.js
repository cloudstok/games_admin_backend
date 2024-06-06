const { register, login } = require('../controller/service/operator');
const { serviceAddGame, serviceFindGame } = require('../controller/service/game');
const { addUser, userLogin} = require('../controller/operator/user');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');
const operatorRouter = require('express').Router();
operatorRouter.post('/create/user', verifyToken, addUser);
operatorRouter.post('/user/login', verifyToken, userLogin)
operatorRouter.post('/game' , serviceAddGame)
operatorRouter.get('/game' , serviceFindGame)

module.exports = { operatorRouter};