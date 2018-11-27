/**
 * Helpers for various tasks
 */
// Dependencys
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

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
        for(let i = 1; i<=len; i++) {
            // Get a random character from the posibleChar string
            const randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
            str += randomChar;
        };
        return str;
    } else {
       return false; 
    };
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = function(phone, msg, callback) {
    // Validate params
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

    if(phone && msg){
        // Configure the request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+1'+phone,
            'Body': msg
        };

        // Stringify the payload 
        const stringPayload = querystring.stringify(payload);

        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth': config.twilio.accountSid+':'+config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // Create an https request and send it
        const req = https.request(requestDetails, (res) => {
            // Grab the status of hte sent request
            const status = res.statusCode;
            // Callback suscessfully  if the request went through
            if(status == 200 || status == 201){
                callback(false);
            } else {
                callback('Status code returned was '+status);
            };
        });

        // Bind to error event so it doesn't get thrown
        req.on('error', (err) => {
            callback(err);
        });

        // Add payload to request
        req.write(stringPayload);

        // End request
        req.end();
    } else {    
        callback('Given params were missing or invalid');
    };
};

 // Export the module
 module.exports = helpers;