const CryptoJS = require('crypto-js');
const { json } = require('express');

const Encryption = async (id) => {
    try {
      if(typeof id == "object"){
        id =  JSON.stringify(id)
      }
      return CryptoJS.AES.encrypt(id, process.env.cryptoSecretKey).toString();
    } catch (er) {
      console.error(er);
    }
  }
  
  const Decryption = async (data) => {
    try {
      const bytes = CryptoJS.AES.decrypt(data, process.env.cryptoSecretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (er) {
      console.error(er);
    }
  }
  module.exports = {Encryption , Decryption}