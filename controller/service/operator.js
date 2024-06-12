
const { compare, hashPassword } = require('../../utilities/bcrypt/bcrypt')
const { read, write } = require('../../db_config/db')
const { generateToken } = require('../../utilities/jwt/jsonwebtoken')
const { generateRandomString, generateRandomUserId, generateUUID } = require('../../utilities/common_function')
const { decryption } = require('../../utilities/ecryption-decryption')
const { setRedis, getRedis, deleteRedis } = require('../../redis/connection')
const { json } = require('express')

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
      return res.status(200).send({ status: true, msg: "Operator logged in..", token })
    } else {
      return res.status(404).json({ status: false, msg: "Operator does not exists" })
    }
  } catch (error) {
    return res.status(500).json({ msg: "Internal server Error", status: false })
  }
}



const register = async (req, res) => {
  try {
    if (req.operator?.user?.user_type === 'admin') {
      const { name, user_type } = req.body;
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
        await write.query("INSERT INTO operator (name, user_id, password, pub_key, secret, user_type) VALUES (?,?,?,?,?, ?)", [name, userId, hashedPassword, pub_key, secret_key, userType]);
        return res.status(200).send({ status: true, msg: "Operator registered successfully", data: { name, userId, password, pub_key, secret_key, user_type } });
      }
    } else {
      return res.status(400).send({ status: false, msg: "User not authorized to perform the operation" });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ status: false, msg: "Internal Server error" });
  }
}

const getOperatorList = async (req, res) => {
  try {
    if (req.operator?.user?.user_type === 'admin') {
      const [operatorList] = await write.query(`SELECT  * FROM operator where user_type = 'operator' and is_deleted = 0`);
      return res.status(200).send({ status: true, msg: "Operators list fetched successfully", data: operatorList });
    } else {
      return res.status(400).send({ status: false, msg: "User not authorized to perform the operation" });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ status: false, msg: "Internal Server error" });
  }
}

const userLogin = async (req, res) => {
  try {
    let { id } = req.params;
    let { data } = req.body;
    const [getOperator] = await write.query(`SELECT * FROM operator WHERE pub_key = ?`, [id]);
    if (getOperator.length > 0) {
      const { user_id, pub_key, secret } = getOperator[0];
      const decodeData = await decryption(data, secret);
      let timeDifference = (Date.now() - decodeData.reqTime) / 1000;
      if (timeDifference > 5) {
        return res.status(400).send({ status: false, msg: "Request timed out" });
      }
      const token = await generateUUID();

      let user = await getRedis('users')
      if (user) {
        user = JSON.parse(user);
        user.push(token)
        await setRedis('users', JSON.stringify(user), 3600)
      } else {
        await setRedis('users', JSON.stringify([token]), 3600)
      }
      await setRedis(token, JSON.stringify({ userId: decodeData.user_id, operatorId: user_id, pub_key, secret }), 100)
      return res.status(200).send({ status: true, msg: "User authenticated", token })
    } else {
      return res.status(400).send({ status: false, msg: "Request initiated for Invalid Operator" });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ status: false, msg: "Internal Server error" });
  }
}



module.exports = { login, register, userLogin, getOperatorList }

