const { getRedis, deleteRedis, setRedis } = require("../../redis/connection");
const { getWebhookUrl } = require("../../utilities/common_function");
const { encryption } = require("../../utilities/ecryption-decryption");
const axios = require('axios');


const activeUser = async (req, res) => {
    try {
        const user = JSON.parse(await getRedis('users'));
        if (!user) {
            return res.status(200).send({ status: true, finalData: [] });
        }
        const finalData = await Promise.all(user.map(async (token) => {
            const userData = JSON.parse(await getRedis(token));
            return { ...userData, token };
        }));
        return res.status(200).send({ status: true, finalData });
    } catch (err) {
        console.error("Error fetching active users:", err);
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
};



const logout = async (req, res) => {
    try {
        const token = req.headers.token;
        const user = JSON.parse(await getRedis('users')) || [];
        const activeUser = user.filter(activeToken => activeToken !== token);
        if (activeUser.length > 0) {
            await setRedis('users', JSON.stringify(activeUser), 100000);
        }
        return res.status(200).send({ status: true, msg: "User Logout Successfully" });
    } catch (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ msg: "Internal server Error", status: false });
    }
};

const getUserDetail = async (req, res) => {
    try {
        const token = req.headers.token;
        let validateUser;
        try {
            validateUser = JSON.parse(await getRedis(token));
        } catch (err) {
            console.error("Error parsing Redis token:", err);
            return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
        }
        if (!validateUser) {
            return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
        }
        const { operatorId } = validateUser;
        const operatorUrl = await getWebhookUrl(operatorId, "USER_DETAILS");
        if (!operatorUrl) {
            return res.status(400).send({ status: false, msg: "No URL configured for the event" });
        }
        const options = {
            method: 'GET',
            url: operatorUrl,
            headers: {
                'Content-Type': 'application/json',
                token
            }
        };
        try {
            const response = await axios(options);
            if (response.status === 200) {
                return res.status(200).send(response.data);
            } else {
                console.log("Received an invalid response from upstream server");
                return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
            }
        } catch (err) {
            console.error("Error during HTTP request:", err);
            return res.status(500).send({ status: false, msg: "Internal Server error" });
        }
    } catch (err) {
        console.error("Error getting user details:", err);
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
}


module.exports = { activeUser, logout, getUserDetail }