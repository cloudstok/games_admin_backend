const CryptoJS = require('crypto-js');
const { json } = require('express');

const encryption = async (plainText , secret) => {
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
};
  

  const decryption = async (strToDecrypt , secret) => {
    let _key = CryptoJS.enc.Utf8.parse(secret);
    let _iv = CryptoJS.enc.Utf8.parse(secret);
    let decrypted = CryptoJS.AES.decrypt(strToDecrypt, _key, {
      keySize: 16,
      iv: _iv,
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  };
  module.exports = {encryption , decryption}

