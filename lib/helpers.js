/**
 * Helpers for various tasks
 */
// Dependencys
const crypto = require('crypto');
const config = require('./config');

// Container for helpers
const helpers = {};

// create a SHA256 hash
helpers._hash = function(str) {
   if(typeof(str) == 'string' && str.length > 0) {
       const hashedPassword = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
       return hashedPassword;
   } else {
       return false;
   }
};

// Parse a JSON string to object in all cases, without throwing
helpers.parseJsonToObject = function(str) {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
};

// Creates a string of random alphanumeric characters of a given length
helpers.createRandomString = function(len) {
    len = typeof(len) == 'number' && len > 0 ? len : false;
    if(len) {
        // Define all possible chars that can go into string
        const possibleChars = 'abcdefghijklmnopqrstuvwxyz1234567890';
        let str = ''
        for(let i = 1; i<=len; i++){
            // Get a random character from the posibleChar string
            const randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
            str += randomChar;
        }
        return str;
    } else {
       return false; 
    }
};

 // Export the module
 module.exports = helpers;