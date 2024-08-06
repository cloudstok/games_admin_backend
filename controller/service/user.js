const { getRedis,  setRedis } = require("../../redis/connection");
const { getWebhookUrl } = require("../../utilities/common_function");
const axios = require('axios');
const getLogger = require('../../utilities/logger');
const GET_USER_DETAIL = getLogger('USER_DETAIL', 'jsonl');



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
// user Detail
const getUserDetail = async (req, res) => {
    const token = req.headers.token;
    GET_USER_DETAIL.info('Received request', { token });
    let validateUser;
    try {
        validateUser = JSON.parse(await getRedis(token));
    } catch (err) {
        GET_USER_DETAIL.error('Error parsing Redis token', {
            token,
            error: err.message,
            stack: err.stack
        });
        GET_USER_DETAIL.error(JSON.stringify({
            req: {
                headers: { token }
            },
            res: { msg: "Error parsing Redis token", ERROR: err }
        }));
        return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
    }

    if (!validateUser) {
        GET_USER_DETAIL.warn('Invalid token or session timed out', { token });
        return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
    }

    const { operatorId } = validateUser;
    GET_USER_DETAIL.info('Validated user', { operatorId });

    let operatorUrl;
    try {
        operatorUrl = await getWebhookUrl(operatorId, "USER_DETAILS");
    } catch (err) {
        GET_USER_DETAIL.error('Error getting webhook URL', {
            operatorId,
            error: err.message,
            stack: err.stack
        });
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    if (!operatorUrl) {
        GET_USER_DETAIL.error('No URL configured for the event', { operatorId });
        return res.status(400).send({ status: false, msg: "No URL configured for the event" });
    }

    GET_USER_DETAIL.info('Operator URL obtained', { operatorUrl });

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
            GET_USER_DETAIL.info('Successfully fetched user details', { data: response.data });
            return res.status(200).send(response.data);
        } else {
            GET_USER_DETAIL.warn('Invalid response from upstream server', { status: response.status, data: response.data });
            return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
        }
    } catch (err) {
        GET_USER_DETAIL.error('Error during HTTP request', {
            error: err.message,
            response: err.response ? err.response.data : 'No response data',
            stack: err.stack
        });
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
};


module.exports = { activeUser, logout, getUserDetail }