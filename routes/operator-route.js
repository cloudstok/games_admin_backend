const { register, login } = require('../controller/service/operator');
const { addUser, userLogin} = require('../controller/operator/user');
const { verifyToken } = require('../utilities/jwt/jsonwebtoken');

const operatorRouter = require('express').Router();

operatorRouter.post('/create/user', verifyToken, addUser);
operatorRouter.post('/register' , register)
operatorRouter.post('/login' , login)
operatorRouter.post('/user/login', verifyToken, userLogin)

module.exports = { operatorRouter};