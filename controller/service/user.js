const { getRedis, deleteRedis, setRedis } = require("../../redis/connection");
const { encryption } = require("../../utilities/ecryption-decryption");
const axios = require('axios');
const activeUser = async (req, res) => {
    try {
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




const getuserDetail = async (req, res) => {
    try {
        const token = req.headers.token;
        let operatorBaseUrl = process.env.operator_base_url;
        const options = {
            method: 'GET',
            url: `${operatorBaseUrl}/operator/user/detail`,
            headers: {
                'Content-Type': 'application/json',
                token
            }
        };

        await axios(options).then(data => {
            if (data.status === 200) {
                return res.status(200).send(data.data);
            } else {
                console.log(`received an invalid response from upstream server`);
                return res.status(data.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(data)}` })
            }
        }).catch(err => {
            return res.status(401).send(err?.response?.data);
        })
    } catch (err) {
        console.error(`[Err] while trying to get user balance is:::`, err)
        res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}

module.exports = { activeUser, logout, getuserDetail }