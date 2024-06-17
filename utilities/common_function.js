
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





const crypto = require('crypto');

function generateUUIDv7() {
    // Get current time in milliseconds since Unix epoch
    const timestamp = Date.now();

    // Convert timestamp to hex string
    const timeHex = timestamp.toString(16).padStart(12, '0');

    // Generate 54 random bits for the rest of the UUID
    const randomBits = crypto.randomBytes(8).toString('hex').slice(2);

    // Assemble UUID components
    const uuid = [
        timeHex.slice(0, 8),  // First 32 bits from timestamp
        timeHex.slice(8) + randomBits.slice(0, 4),  // Next 16 bits from timestamp + 16 random bits
        '7' + randomBits.slice(4, 7),  // Version 7 + 12 random bits
        (parseInt(randomBits.slice(7, 8), 16) & 0x3f | 0x80).toString(16) + randomBits.slice(8, 12),  // Variant + 14 random bits
        randomBits.slice(12)  // Remaining random bits
    ];

    return uuid.join('-');
}

// Generate a UUID v7
// const uuid7 = generateUUIDv7();


module.exports = { generateRandomString, generateRandomUserId, generateUUID , generateUUIDv7}