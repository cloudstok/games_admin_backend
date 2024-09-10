const { getRedis,  setRedis } = require("../../utilities/redis-connection");
const { getWebhookUrl, generateUUIDv7 } = require("../../utilities/common_function");
const axios = require('axios');
const getLogger = require('../../utilities/logger');
const userLogger = getLogger('User_Data', 'jsonl');
const failedUserLogger = getLogger('Failed_User_Data', 'jsonl');


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
    const logId = await generateUUIDv7();
    const token = req.headers.token;
    let logDataReq = {logId, token};
    userLogger.info(JSON.stringify(logDataReq));
    let validateUser;
    try {
        validateUser = JSON.parse(await getRedis(token));
    } catch (err) {
        failedUserLogger.error(JSON.stringify({ req: logDataReq, res: 'Error parsing Redis token'}));
        return res.status(400).send({ status: false, msg: "We've encountered an internal error" });
    }

    if (!validateUser) {
        failedUserLogger.error(JSON.stringify({ req: logDataReq, res: 'Invalid token or session timed out'}));
        return res.status(401).send({ status: false, msg: "Invalid Token or session timed out" });
    }

    const { operatorId } = validateUser;

    let operatorUrl;
    try {
        operatorUrl = await getWebhookUrl(operatorId, "USER_DETAILS");
    } catch (err) {
        failedUserLogger.error(JSON.stringify({ req: logDataReq, res: 'Error while fetching webhook URL'}));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }

    if (!operatorUrl) {
        failedUserLogger.error(JSON.stringify({ req: logDataReq, res: 'No URL configured for the event'}));
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
            userLogger.info(JSON.stringify({req: logDataReq, res: response?.data}));
            return res.status(200).send(response.data);
        } else {
            failedUserLogger.error(JSON.stringify({ req: logDataReq, res: response?.data}));
            return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
        }
    } catch (err) {
        let response = err.response ? err.response.data : err;
        failedUserLogger.error(JSON.stringify({ req: logDataReq, res: response}));
        return res.status(500).send({ status: false, msg: "Internal Server error" });
    }
};


const getuserDataFromredis = async (req, res) => {
    try {
      const { token } = req.headers;
      if (!token) {
        return res.status(400).send({ status: false, msg: "Token is missing" });
      }
      const userData = await getRedis(token);
      if (!userData) {
        return res.status(404).send({ status: false, msg: "User data not found" });
      }
      return res.status(200).send({ status: true, userData: JSON.parse(userData) });
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res.status(500).send({ status: false, msg: "Internal Server Error" });
    }
  };
  

module.exports = { activeUser, logout, getUserDetail , getuserDataFromredis }