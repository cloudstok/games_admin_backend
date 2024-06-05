
const { compare, hashPassword } = require('../../bcrypt/bcrypt')
const { read ,write } = require('../../db_config/db')
const { generateToken } = require('../../jwt/jsonwebtoken')

const login = async (req, res) => {
  try {
    const { user_id , password } = req.body
    const [data] = await read.query("SELECT user_id , password  FROM operator where user_id = ?", [user_id])
    if (data.length > 0) {
      const checkPassword = await compare(password, data[0].password)

      if (!checkPassword) {
        return res.status(401).json({ status: false, msg: "Missing or Incorrect Credentials" });
      }
      const Token = await generateToken(data[0], res)
      return res.status(200).send({ status: true, Token,  role : data[0].role })
    } else {
      return res.status(404).json({ status: false, msg: "USER NOT EXIST" })
    }
  } catch (er) {
    return res.status(500).json({ msg: "Internal server Error", status: false, ERROR: er })
  }
}



const register = async (req, res) => {
  try {
    const { user_id, password } = req.body;
    const [data] = await read.query("SELECT user_id , password FROM operator where user_id = ?", [user_id])
    if (data.length > 0) {
      return res.status(200).send({ status: false, msg: "USER ALREADY EXIST" })
    } else {
      const hash = await hashPassword(password)


     const secret_key =   generateRandomString(32)
     const pub_key =   generateRandomString(12)

     console.log({secret_key , pub_key})
      await write.query("INSERT INTO operator(user_id, password  , pub_key,  secret) VALUES (?, ? , ?, ?)", [user_id, hash , pub_key , secret_key])
      return res.status(200).send({ status: true, msg: "OPERATOR REGISTERED SUCCESSFULLY" })
    }
  } catch (er) {
    console.log(er)
    return res.status(400).send({ status: false, Error: er })
  }
}




function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}



module.exports = { login, register }

