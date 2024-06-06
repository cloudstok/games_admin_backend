
async function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let randomString = "";
    for (let i = 0; i < length; i++) {
      randomString += chars[Math.floor(Math.random() * chars.length)];
    }
    return randomString;
  }

  
async function generateRandomUserId(name) {
    return `${name}_${Math.round(Math.random() * 10000)}`;
  }

async function generateUUID() {
    function getRandomHexDigit() {
        return Math.floor(Math.random() * 16).toString(16);
    }

    // Generate UUID parts
    let uuid = '';
    for (let i = 0; i < 8; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-';
    for (let i = 0; i < 4; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-4'; // UUID version 4
    for (let i = 0; i < 3; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-';
    uuid += (8 + Math.floor(Math.random() * 4)).toString(16); // Set bits 6-7 to 10
    for (let i = 0; i < 3; i++) {
        uuid += getRandomHexDigit();
    }
    uuid += '-';
    for (let i = 0; i < 12; i++) {
        uuid += getRandomHexDigit();
    }

    return uuid;
}

module.exports = { generateRandomString, generateRandomUserId, generateUUID}