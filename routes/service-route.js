const { addGame, findGame } = require('../controller/operator/game');
const { addUser} = require('../controller/operator/user');
const { register, login, userLogin } = require('../controller/service/operator');

const serviceRouter = require('express').Router();

serviceRouter.post('/create/operator', register);
serviceRouter.post('/operator/login', login);
serviceRouter.post('/game' , addGame)
serviceRouter.post('/user/login/:id' , userLogin)


module.exports = { serviceRouter};