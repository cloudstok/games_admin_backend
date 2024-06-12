
const { default: axios } = require("axios");
const { read, write } = require("../../db_config/db");
const { getRedis } = require("../../redis/connection");




const addGame = async (req, res) => {
    try {
        if (req.operator?.user?.user_type === 'admin') {
            const { name, url } = req.body
            await write.query("insert into games_master_list (name , url ) value(? , ?)", [name, url])
            return res.status(200).send({ status: true, msg: "games Add successfully to master's list" })

        } else {
            return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const findGame = async (req, res) => {
    try {

        let token = req.headers.token;
        let validateUser = await getRedis(token);
        try {
            validateUser = JSON.parse(validateUser)
        } catch (err) {
            console.error(`[ERR] while parsing json data is::`, err);
            return res.status(500).send({ status: false, msg: "Internal Server Error" })
        }
        if (validateUser) {
            const [data] = await write.query("select * from operator_games as op right join games_master_list as gml on gml.game_id = op.game_id where operator_id = ?", [validateUser.operatorId]);
            return res.status(200).send({ status: true, data })
        } else {
            return res.status(401).send({ status: false, msg: "Session expired.! Please login again." });
        }
    } catch (er) {
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}


const getGameFromServiceProvider = async (req, res) => {
    try {
        const { token } = req.headers;
        let data = await axios.get('localhost:4000/operator/game', {
            headers: {
                "token": token
            }
        })
    } catch (er) {
        console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

const operatorFindGame = async (req, res) => {
    try {
        const { token } = req.headers;
        const url = process.env.service_provider_url;
        let config = {
            method: 'GET',
            url: `${url}/service/operator/game`,
            headers: {
                token
            }
        };

        await axios(config).then(data => {
            if (data.status === 200) {
                return res.status(200).send({ status: true, msg: "games list fetched successfully", data: data.data });
            }
            //  else {
            //     console.log(`received an invalid response from upstream server`);
            //     return res.status(401).send({ status: false, msg: "Token Expired or Request timed out.!" })
            // }
        }).catch(err => {
        //    console.error(`[ERR] while getting games from service operator is::`, err.response.data)
          //  return res.status(401).send(err.response.data);
            let data = err.response.data
            return res.status(401).send( {...data , code : 401} );
        })


    } catch (er) {
        // console.log(er)
        return res.status(500).json({ msg: "Internal server Error", status: false })
    }
}

module.exports = { addGame, findGame, getGameFromServiceProvider, operatorFindGame }