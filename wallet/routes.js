const { userlogin } = require('./controller/controller')

// const { register, login } = require('./controller/operator')

const  routes = require('express').Router()
routes.get('/test' ,async (req ,res)=>{
    console.log(req.body)
    res.send({"msg" : "Testing Successfully 👍"})
})




// routes.post('/register' , register)
// routes.post('/login' , login),
routes.post('/game/:admin/:user' ,userlogin )

module.exports = {routes}