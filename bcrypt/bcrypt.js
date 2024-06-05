const bcrypt = require("bcrypt");
    async function hashPassword(password ){
        try{
            return await bcrypt.hash(password, 10)
        }catch{er}{
            console.error(er);
        }
    }
    async function compare (Password  , hashPassword ){
        return await bcrypt.compare(Password, hashPassword)
    }
module.exports = {hashPassword , compare}