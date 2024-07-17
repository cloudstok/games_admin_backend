const {write} = require('../../db_config/db');
const { encryption, decryption } = require('../../utilities/ecryption-decryption');
const axios = require('axios');


const rollbackCredit = async (req, res) => {
    try {
        const operator = await getOperatorDetails();
        if (!operator) {
            return res.status(400).send({ status: false, msg: "Request initiated for Invalid Operator.!" });
        }
        const { secret } = operator;
        const { txnRefId } = req.body;
        const { token } = req.headers;
        const encryptedData = await encryptTransactionData(txnRefId, secret);
        try {
            const response = await makeRollbackRequest(encryptedData, token);
            if (response.status === 200) {
                await handleSuccessResponse(response, secret, res);
            } else {
                console.log('Received an invalid response from upstream server');
                return res.status(response.status).send({ status: false, msg: `Request failed from upstream server with response: ${JSON.stringify(response.data)}` });
            }
        } catch (error) {
            handleErrorResponse(error, res);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ status: false, msg: "Internal Server Error" });
    }
};

const getOperatorDetails = async () => {
    const [operator] = await write.query(`SELECT * FROM operator WHERE user_type = 'operator' AND is_deleted = 0 LIMIT 1`);
    return operator.length > 0 ? operator[0] : null;
};

const encryptTransactionData = async (txnRefId, secret) => {
    return await encryption({ txnRefId }, secret);
};

const makeRollbackRequest = async (encryptedData, token) => {
    const { service_provider_url } = process.env;

    const options = {
        method: 'POST',
        url: `${service_provider_url}/service/operator/rollback`,
        headers: {
            'Content-Type': 'application/json',
            token
        },
        data: {
            data: encryptedData
        }
    };

    return await axios(options);
};

const handleSuccessResponse = async (response, secret, res) => {
    const responseData = response.data;
    const decodedData = await decryption(responseData?.data, secret);
    delete responseData.data;
    return res.status(200).send({ ...responseData, data: { ...decodedData } });
};

const handleErrorResponse = (error, res) => {
    const data = error?.response;
    return res.status(data?.status || 500).send({ ...data?.data });
};

module.exports = { rollbackCredit};