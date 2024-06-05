const { register, login } = require('../controller/service/operator');
const { addGame, findGame } = require('../controller/operator/game');
const { addUser, userLogin} = require('../controller/operator/user');

const operatorRouter = require('express').Router();

operatorRouter.post('/create/user', addUser);
operatorRouter.post('/register' , register)
operatorRouter.post('/login' , login)
operatorRouter.post('/user/login' , userLogin)

operatorRouter.post('/game' , addGame)
operatorRouter.get('/game' , findGame)


module.exports = { operatorRouter};