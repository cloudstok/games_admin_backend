const axios = require('axios');
const { getRedis } = require('../../redis/connection');
const { encryption } = require('../../utilities/ecryption-decryption');

const getUserBalance = async(req, res) => {
    try{
        const token = req.headers.token;
        let validateUser = await getRedis(token);
        console.log(validateUser , "validateUser")
        try{
            validateUser = JSON.parse(validateUser);
        }catch(err){
            return res.status(400).send({ status: false, msg: "We've encountered an internal error"})
        }
        if(validateUser){
            const {userId, operatorId, secret} = validateUser;
            let operatorBaseUrl = process.env.operator_base_url;
            let encryptedData = await encryption({userId}, secret);
            const options = {
                method: 'POST',
                url: `${operatorBaseUrl}/operator/user/balance/${operatorId}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    data: encryptedData
                }
            };
            await axios(options).then(data=>{
                if(data.status === 200){
                    return res.status(200).send({ status: true, msg: "user balance fetched successfully", data: data.data});
                }else{
                    console.log(`received an invalid response from upstream server`);
                    return res.status(data.status).send({ status: false, msg:`Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                }
            }).catch(err=>{
                console.error(`[ERR] while getting user balance from operator is::`, JSON.stringify(err))
                return res.status(500).send({ status: false, msg: "We've encountered an internal error" });
            })
        }else{
            return res.status(400).send({ status: false, msg: "Invalid Token or session timed out"});
        }
    }catch(err){
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error"});
    }
}

const updateUserBalance = async(req, res) => {
    try{
        const token = req.headers.token;
        const { balance } = req.body;
        let validateUser = await getRedis(token);
        try{
            validateUser = JSON.parse(validateUser);
        }catch(err){
            return res.status(400).send({ status: false, msg: "We've encountered an internal error"})
        }
        if(validateUser){
            const {userId, operatorId, secret} = validateUser;
            let operatorBaseUrl = process.env.operator_base_url;
            let encryptedData = await encryption({userId, balance}, secret);
            const options = {
                method: 'PUT',
                url: `${operatorBaseUrl}/operator/user/balance/${operatorId}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    data: encryptedData
                }
            };
            await axios(options).then(data=>{
                if(data.status === 200){
                    return res.status(200).send({ status: true, msg: "user balance updated successfully", data: data.data});
                }else{
                    console.log(`received an invalid response from upstream server`);
                    return res.status(data.status).send({ status: false, msg:`Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                }
            }).catch(err=>{
                console.error(`[ERR] while updating user balance from operator is::`, JSON.stringify(err))
                return res.status(500).send({ status: false, msg: "We've encountered an internal error" });
            })
        }else{
            return res.status(400).send({ status: false, msg: "Invalid Token or session timed out"});
        }
    }catch(err){
        console.error(`[Err] while trying to update user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error"});
    }
}

module.exports = {getUserBalance, updateUserBalance}