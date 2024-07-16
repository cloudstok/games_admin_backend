const {write} = require('../../db_config/db');
const { encryption, decryption } = require('../../utilities/ecryption-decryption');
const axios = require('axios');




const rollbackCredit = async(req, res)=> {
    try {
        // const { pub_key, secret } = req.operator.user;
        const [getOperator] = await write.query(`SELECT * FROM operator WHERE user_type = 'operator' and is_deleted = 0 LIMIT 1`);
        const { secret } = getOperator[0];
        const { txnRefId } = req.body;
        const {token} = req.headers;

        //const [[wallet]] = await write.query(`SELECT * FROM user_wallet WHERE user_id = ?`, [userId]);
        if (getOperator.length > 0) {
            let encryptedData = await encryption({ txnRefId }, secret);
            const { service_provider_url } = process.env;

            //logging into service provider
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
            // console.log(options , "options")
            await axios(options).then(async data => {
                if (data.status === 200) {
                    const response = data.data;
                    const decodeData = await decryption(response?.data, secret);
                    delete response.data;
                    return res.status(200).send({ ...response, data:{...decodeData} });
                }
                else {
                    console.log(`received an invalid response from upstream server`);
                    return res.status(data.status).send({ status: false, msg: `Request failed from upstream server with response:: ${JSON.stringify(data)}` })
                }
            }).catch(err => {
                let data = err?.response
                return res.status(data.status).send({ ...data?.data });
            })

        } else {
            return res.status(400).send({ status: false, msg: "Request initiated for Invalid Operator.!" });
        }

    } catch (err) {
        console.error(err);
        return res.send(500).send({ status: false, msg: "Internal Server Error" });
    }
}

module.exports = { rollbackCredit};