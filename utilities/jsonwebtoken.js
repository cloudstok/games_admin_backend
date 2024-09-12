const jwt = require('jsonwebtoken')
async function generateToken(storeData, res) {
  try {
    const Token = await jwt.sign({ user: storeData }, process.env.jwtSecretKey, {expiresIn: '1h'});
    return Token
  } catch (err) {
    console.error(er);
  }
}
async function verifyToken(req, res, next) {
  try {
    const tokenHeader = req.headers.authorization;
    if (!tokenHeader)
      return res.status(401).json({ status : false , "message": "Token not found" });
    const token = tokenHeader.split(" ")[1];
    const verifiedToken = jwt.verify(token, process.env.jwtSecretKey);
    if (!verifiedToken)
      return res.status(401).json({ status : false , "message": "invalid token" })
    req.operator = verifiedToken;
    // return(res.locals.auth)
    next()
  } catch (err) {
    return res.status(400).send({ err })
  }
}


const auth = (auth) => async (req, res, next) => {
  
  try {
    const tokenHeader = req.headers.authorization;
    if (!tokenHeader)
      return res.status(401).json({ status : false ,"message": "Token not found" });
    const token = tokenHeader.split(" ")[1];
    const verifiedToken = jwt.verify(token, process.env.jwtSecretKey);
    if (!verifiedToken) {
      return res.status(401).json({ status : false , "message": "invalid token" })
    }
    if (auth.includes(verifiedToken.user.user_type)) {
      res.locals.auth = verifiedToken;
      next()
    } else {
      return res.status(401).send({ status : false , msg: "You are not authorized.", status: false })
    }
  } catch (err) {
    return res.status(400).send({ err })
  }
};

module.exports = {
  auth, verifyToken, generateToken
}
