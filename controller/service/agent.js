
const { compare, hashPassword } = require('../../utilities/bcrypt')
const {  write } = require('../../utilities/db-connection');
const { variableConfig, loadConfig } = require('../../utilities/load-config');


const addAgent = async (req, res) => {
  try {
    const { user_id, password, user_type = "agent" } = req.body;
    const getUser = variableConfig.user_credentials.find(e=> e.user_id === user_id) || null
    if (getUser) {
      return res.status(400).send({ status: false, msg: "User already exists" });
    }
      const hashedPassword = await hashPassword(password);
      await write("INSERT IGNORE INTO user_credentials (user_id, password, user_type) VALUES (?, ?, ?)", [user_id, hashedPassword, user_type]);
      await loadConfig({ loaduser_credentials: true});
      return res.status(200).send({ status: true, msg: "User added successfully" });
    
  } catch (error) {
    console.error(error);
    return res.status(500).send({ status: false, msg: "Internal Server Error" });
  }
};

const agentList = async (req, res) => {
    try {
      let { limit = 100, offset = 0 } = req.query;
      limit = parseInt(limit);
      offset = parseInt(offset);
      if (isNaN(limit) || isNaN(offset)) {
        return res.status(400).send({ status: false, msg: "Invalid limit or offset" });
      }
        const [AgentList] = await write(
          `SELECT * FROM user_credentials WHERE user_type = 'agent' LIMIT ? OFFSET ?`,
          [limit, offset]
        );
        return res.status(200).send({ status: true, msg: "Users list fetched successfully", data: AgentList });
    } catch (error) {
      return res.status(500).send({ status: false, msg: "Internal Server Error" });
    }
  };
  
const agentChangePassword = async (req, res) => {
    try {
      const {newPassword , password} = req.body;
     const {user_id}= res.locals.auth.user
      const getUser = variableConfig.user_credentials.find(e=> e.user_id === user_id) || null
      if (!getUser) {
        return res.status(404).send({ status: false, msg: "User not found" });
      }
      const isPasswordCorrect = await compare(password, getUser.password);
      if (!isPasswordCorrect) {
        return res.status(400).send({ status: false, msg: "Incorrect  password" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await write("UPDATE user_credentials SET password = ? WHERE user_id = ?", [hashedPassword, user_id]);
     await loadConfig({ loaduser_credentials: true});
      return res.status(200).send({ status: true, msg: "Password updated successfully" });
    } catch (error) {
      console.error(error); 
      return res.status(500).send({ status: false, msg: "Internal Server Error" });
    }
  };

  const resetAgentPassword = async (req, res) => {
    try {
      const {user_id, password} = req.body;
      const getUser = variableConfig.user_credentials.find(e=> e.user_id === user_id) || null
      if (!getUser) return res.status(404).send({ status: false, msg: "Agent not found" });
      const hashedPassword = await hashPassword(password);
      await write("UPDATE user_credentials SET password = ? WHERE user_id = ?", [hashedPassword, user_id]);
      await loadConfig({ loaduser_credentials: true});
      return res.status(200).send({ status: true, msg: "Password updated successfully", password });
    } catch (error) {
      console.error(error); 
      return res.status(500).send({ status: false, msg: "Internal Server Error" });
    }
  };


const deleteAgent = async (req, res) => {
    try {
      const { user_id } = req.query;
      if (!user_id) {
        return res.status(400).send({ status: false, msg: "Invalid agent ID" });
      }
      const [result] = await write(
        `DELETE FROM user_credentials WHERE user_type = 'agent' AND user_id = ?`,
        [user_id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).send({ status: false, msg: "User not found" });
      }
      await loadConfig({ loaduser_credentials: true});
      return res.status(200).send({ status: true, msg: " USer deleted successfully" });
    } catch (error) {
      console.log(error)
      return res.status(500).send({ status: false, msg: "Internal Server Error" });
    }
  };
  
  




module.exports = {   agentList  , addAgent , agentChangePassword , deleteAgent, resetAgentPassword}

