/**
 * Worker related tasks
 */

 // Dependancies
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');

const helpers = require('./helpers');
const _data = require('./data');
const _logs = require('./logs');

//  This allows you to use the NOIDE_DEBUG cli arg to specify your own debug commands
const util = require('util');
const debug = util.debuglog('workers');

const workers = {};

workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck){
    const logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };

    const logString = JSON.stringify(logData);

    // Determine the name of the log file
    const logFileName = originalCheckData.id;

    // Append the log string to the file
    _logs.append(logFileName, logString, (err)=> {
        if(!err) {
            console.log("logging to file succeeded")
        } else {
            console.log("logginf to file failed");
        }
    });
}

// Lookup all the checks, get the data, send to validator
workers.gatherAllChecks = function() {
    // Get all the checks
    _data.list('checks', (err, checks) => {
        if(!err && checks && checks.length > 0) {
            checks.forEach(check => {
                // Read the check data
                _data.read('checks', check, (err, originalCheckData) => {
                    if(!err && originalCheckData){
                        // Pass it to the check validator and let that function continue
                        workers.validateCheckData(originalCheckData);
                    } else { 
                        console.log('Error reading one of the checks.')
                    };
                }); 
            }); 
        } else {
            console.log("ERROR: Could not find any checks to process.")
        };
    });
};

// Sanitiy check the checks data
workers.validateCheckData = function(originalCheckData) {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['https', 'http'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get', 'put', 'post', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set if the workers have never seen this check before, states starts at down
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all the checks pass, then pass data along to the next process
    if(originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol && 
        originalCheckData.url && 
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {
            workers.performCheck(originalCheckData);
        } else {
            console.log('Error: One of the checks is not formatted. Skipping it.')
        }
}

// Perform the check, send the originalCheckData and the outcome of the check
workers.performCheck = function(originalCheckData) {
    // Prepare the initial check outcome
    const checkOutcome = {
        'error': false,
        'responseCode': false
    };

    // Mark the outcome as not sent yet
    const outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    const parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // using path and not "pathname" because we want the full query string
    
    // Construct the request
    const requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object (using the http or the https module)
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;

    // Craft the request
    const req = _moduleToUse.request(requestDetails, (res) => {
        const status = res.statusCode;

        // Update the check outcome
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
        };
    });

    // Bind to the error event so that it does not get thrown
    req.on('error', (e) => {
        // Update the check outcome and pass it along
        checkOutcome.error = {
            'error': true,
            'value': e
        };

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        };
    });

    // Bind to the timeout event so that it does not get thrown
    req.on('timeout', (e) => {
        // Update the check outcome and pass it along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        };
    });

    // End the request
    req.end();
};

// Process the check outcome, update the check data as needed and trigger alert to user as needed
// Special logic for accomodating a check that has never been tested before
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
    // Decide if the check is considers up or done in its current state
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if we need an alert
    const alertWarranted  = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome of the check
    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, (err) => {
        if(!err) {
            if(alertWarranted) {
                workers.alertUserToStatusChange(newCheckData)
            } else {
                console.log('No alert is warranted');
            };
        } else {
            console.log('Error trying to update check data');
        };
    });
};

// Alert the user to a change in ther check status
workers.alertUserToStatusChange = function(newCheckData) {
    const msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + 
                newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + 
                newCheckData.state;

    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
        if(!err){
            console.log("SUCCESS: User was alerted the message", msg);
        } else {
            console.log("Error: Could not send the user the message, even though the state changed in their check.");
        }      
    });
}

// Timer to execute the worker-process once per minute
workers.loop = function() {
    setInterval(function() {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

// Timer to execute log rotation process once per day
workers.logRotationLoop = function() {
    setInterval(function() {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

// Rotate (compress) the log files
workers.rotateLogs = function() {
    // List all the (non compressed) log files
    _logs.list(false, (err, logs) => {
        if(!err && logs && logs.length > 0) {
            logs.forEach(logName => {
                const logId = logName.replace('.log', '');
                const newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, (err) => {
                    if(!err){
                        // Truncate the log
                        _logs.truncate(logId, (err) => {
                            if(!err) {
                                console.log('Success truncating log file.');
                            } else {
                                console.log('Error truncating log file.')
                            }
                        })
                    } else {
                        console.log('Error compressing one of the log files', err);
                    }
                });
            });
        } else {
            console.log('Error could not find any logs to rotate');
        }
    });
};


// Init script
workers.init = function() {

    // Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs immediately
    workers.rotateLogs();

    // Call the compression loop, so that logs are compressed later
    workers.logRotationLoop();
};

module.exports = workers;