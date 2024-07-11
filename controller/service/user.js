const { getRedis, deleteRedis, setRedis } = require("../../redis/connection");
const { getWebhookUrl } = require("../../utilities/common_function");
const { encryption } = require("../../utilities/ecryption-decryption");
const axios = require('axios');
const activeUser = async (req, res) => {
    try {
        // const{limit , offset} =  req.query
        //   await deleteRedis('users')
        const finalData = []
        let user = JSON.parse(await getRedis('users'))
        if (user) {
            for (let x of user) {
                //  {x : JSON.parse(await getRedis(x))}
                loginUser = { ...JSON.parse(await getRedis(x)), 'token': x }
                finalData.push(loginUser)
            }
        }

        return res.status(200).send({ status: true, finalData })
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}


const logout = async (req, res) => {
    try {
        const activeUser = []
        const token = req.headers.token
        let user = JSON.parse(await getRedis('users'))
        if (user) {
            for (let x of user) {
                if (token != x) {
                    activeUser.push(x)
                }
            }
        }

        if (activeUser.length > 0) {
            await setRedis('users', JSON.stringify(activeUser), 100000)
        }

        return res.status(200).send({ status: true, msg: "User Logout Successfully" })
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}




const getUserDetail = async (req, res) => {
    try {
        const token = req.headers.token;
        let validateUser = await getRedis(token);
        try {
            validateUser = JSON.parse(validateUser);
        } catch (err) {
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" })
        }
        if (validateUser) {
            let {operatorId} = validateUser;
            let operatorUrl = await getWebhookUrl(operatorId, "USER_DETAILS")
            // let operatorUrl = process.env.operator_base_url;
            if(operatorUrl){
                const options = {
                    method: 'GET',
                    url: operatorUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        token
                    }
                };
                await axios(options).then(data => {
                    if (data.status === 200) {
                        return res.status(200).send({...data.data , operatorId});
                    } else {
                        console.log(`received an invalid response from upstream server`);
                        return res.status(data.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                    }
                }).catch(err => {
                    return res.status(400).send(err?.response?.data);
                })
            }else{
                return res.status(400).send({ status: false, msg: "No URL configured for the event"});
            }
        } else {
            return res.status(400).send({ status: false, msg: "Invalid Token or session timed out" });
        }
    } catch (err) {
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}

module.exports = { activeUser, logout, getUserDetail }