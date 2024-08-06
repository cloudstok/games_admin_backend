
const { compare, hashPassword } = require('../../utilities/bcrypt/bcrypt')
const { read, write } = require('../../db_config/db')
const { generateToken } = require('../../utilities/jwt/jsonwebtoken')
const { generateRandomString, generateRandomUserId, generateUUID, generateUUIDv7 } = require('../../utilities/common_function')
const { decryption } = require('../../utilities/ecryption-decryption')
const { setRedis, getRedis, deleteRedis } = require('../../redis/connection')


// Operator login API
const login = async (req, res) => {
  try {
    const { userId, password } = req.body
    const [data] = await read.query("SELECT id, user_id, password, pub_key, secret, user_type  FROM operator where user_id = ?", [userId])
    if (data.length > 0) {
      const checkPassword = await compare(password, data[0].password)
      if (!checkPassword) {
        return res.status(401).json({ status: false, msg: "Missing or Incorrect Credentials" });
      }
      const token = await generateToken(data[0], res)
      return res.status(200).send({ status: true, msg: "Operator logged in..", token ,role : data[0].user_type })
    } else {
      return res.status(404).json({ status: false, msg: "Operator does not exists" })
    }
  } catch (error) {
    return res.status(500).json({ msg: "Internal server Error", status: false })
  }
}



// Operator change Password
const OperatorchangePassword = async (req, res) => {
  try {
    const { id, user_id, password, pub_key, secret, user_type } = req.operator.user
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.status(200).send({ status: true, msg: `your ${newPassword} is not match your ${confirmPassword}` })
    }
    const [getUser] = await write.query(`SELECT * FROM operator WHERE user_id = ?`, [user_id]);
    if (getUser.length > 0) {
      const checkPassword = await compare(currentPassword, getUser[0].password)
      if (!checkPassword) {
        return res.status(401).json({ status: false, msg: "Missing or Incorrect Credentials" });
      } else {
        const hashedPassword = await hashPassword(newPassword);
        await read.query("update operator set password = ? where user_id = ?", [hashedPassword, user_id])
        return res.status(200).send({ status: true, msg: "change password successfully" })
      }
    } else {
      return res.status(400).send({ status: false, msg: "User does not exists" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal server Error", status: false })
  }
}

// Operator Register Successfully
const register = async (req, res) => {
  try {
    if (req.operator?.user?.user_type === 'admin') {
      const { name, user_type, url } = req.body;
      const [data] = await read.query("SELECT * FROM operator where name = ?", [name]);
      if (data.length > 0) {
        return res.status(200).send({ status: false, msg: "Operator already registered with this name" });
      } else {
        const userId = await generateRandomUserId(name);
        let randomNumbers = await generateRandomString(54);
        let breakPoints = [10, 32, 12]
        let parts = [];
        let initialPos = 0;
        breakPoints.forEach(len => {
          parts.push(randomNumbers.substr(initialPos, len));
          initialPos += len
        });
        const [password, secret_key, pub_key] = parts;
        const hashedPassword = await hashPassword(password);
        let userType = user_type ? user_type : 'operator';
        await write.query("INSERT  IGNORE INTO operator (name, user_id, password, pub_key, secret, user_type , url) VALUES (?,?,?,?,?, ? , ?)", [name, userId, hashedPassword, pub_key, secret_key, userType, url]);
        return res.status(200).send({ status: true, msg: "Operator registered successfully", data: { name, userId, password, pub_key, secret_key, user_type, url } });
      }
    } else {
      return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ status: false, msg: "Internal Server error" });
  }
}

const getOperatorList = async (req, res) => {
  try {
    let { limit = 100, offset = 0 } = req.query;
    limit = parseInt(limit);
    offset = parseInt(offset);
    if (isNaN(limit) || isNaN(offset)) {
      return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
    }

    if (req.operator?.user?.user_type === 'admin') {
      const [operatorList] = await write.query(`SELECT  * FROM operator where user_type = 'operator' and is_deleted = 0 limit ? offset ?`, [+limit, +offset]);
      return res.status(200).send({ status: true, msg: "Operators list fetched successfully", data: operatorList });
    } else {
      return res.status(401).send({ status: false, msg: "User not authorized to perform the operation" });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ status: false, msg: "Internal Server error" });
  }
}



// User login 
const userLogin = async (req, res) => {
  try {
    let { id } = req.params;
    let { data } = req.body;
    const [getOperator] = await write.query(`SELECT * FROM operator WHERE pub_key = ?`, [id]);
    if (getOperator.length > 0) {
      let { user_id, pub_key, secret, url } = getOperator[0];
      const decodeData = await decryption(data, secret);
      const token = await generateUUIDv7();
      let user = await getRedis('users')
      if (user) {
        user = JSON.parse(user);
        user.push(token)
        await setRedis('users', JSON.stringify(user), 3600 * 24)
      } else {
        await setRedis('users', JSON.stringify([token]), 3600 * 24)
      }
      url = decodeData?.url ? decodeData.url : url;
      await setRedis(token, JSON.stringify({ userId: decodeData.user_id, operatorId: user_id, pub_key, secret, url }), 3600 * 24)
      return res.status(200).send({ status: true, msg: "User authenticated", token });
    } else {
      return res.status(400).send({ status: false, msg: "Request initiated for Invalid Operator" });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ status: false, msg: "Internal Server error" });
  }
}


// Operator change Password

const changePassword = async (req, res) => {
  try {

    let { token } = req.headers;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.status(200).send({ status: true, msg: `your ${newPassword} is not match your ${confirmPassword}` })
    }
    const { userId } = JSON.parse(await getRedis(token))
    const [getUser] = await write.query(`SELECT * FROM user WHERE user_id = ?`, [userId]);
    if (getUser.length > 0) {
      const checkPassword = await compare(currentPassword, getUser[0].password)
      if (!checkPassword) {
        return res.status(401).json({ status: false, msg: "Missing or Incorrect Credentials" });
      } else {
        const hashedPassword = await hashPassword(newPassword);
        await read.query("update user set password = ? where user_id = ?", [hashedPassword, userId])
        return res.status(200).send({ status: true, msg: "change password successfully" })
      }
    } else {
      return res.status(400).send({ status: false, msg: "User does not exists" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal server Error", status: false })
  }
}



module.exports = { login, register, userLogin, getOperatorList, changePassword, OperatorchangePassword }

