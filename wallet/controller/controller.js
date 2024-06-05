
const jwt =require('jsonwebtoken');
const { Decryption } = require('../crypto/crypto');
const userlogin = async(req ,res)=>{
    try{
 const {admin , user} = req.params
const adminData = await Decryption(jwt.verify(admin, process.env.jwtSecretKey).user)

adminData.balence =3000
  return res.status(200).send({status : true , adminData })
    }catch(er){
        console.error(er);
        return res.status(500).send({status : false , ERROR : er})
    }
}
module.exports ={
userlogin
}