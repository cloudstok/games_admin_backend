const { getRedis, deleteRedis, setRedis } = require("../../redis/connection");

const activeUser = async (req, res) => {
    try {
        //   await deleteRedis('users')
        const finalData = []
        let user = JSON.parse(await getRedis('users'))
        console.log(user)
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
        for (let x of user) {
            if (token != x) {
                activeUser.push(x)
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

module.exports = { activeUser, logout }