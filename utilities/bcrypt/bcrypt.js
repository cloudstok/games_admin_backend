const bcrypt = require("bcrypt");
    const hashPassword = async(password )=>{
        try{
            return await bcrypt.hash(password, 10)
        }catch(err){
            console.error(err);
        }
    }
    async function compare (Password  , hashPassword ){
        return await bcrypt.compare(Password, hashPassword)
    }
module.exports = {hashPassword , compare}