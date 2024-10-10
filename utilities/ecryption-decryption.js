const CryptoJS = require('crypto-js');

const encryption = async (plainText , secret) => {
  try{
    let _key = CryptoJS.enc.Utf8.parse(secret);
    let _iv = CryptoJS.enc.Utf8.parse(secret);
    let encrypted = CryptoJS.AES.encrypt(JSON.stringify(plainText), _key, {
      keySize: 16,
      iv: _iv,
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    encrypted = encrypted.toString();
    return encrypted;

  }catch(er){
console.error(er);
  }

};
  

  const decryption = async (strToDecrypt , secret) => {
    try{
      let _key = CryptoJS.enc.Utf8.parse(secret);
      let _iv = CryptoJS.enc.Utf8.parse(secret);
      let decrypted = CryptoJS.AES.decrypt(strToDecrypt, _key, {
        keySize: 16,
        iv: _iv,
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);

    }catch(er){
      console.error(er);
    }
  
  };
  module.exports = {encryption , decryption}

