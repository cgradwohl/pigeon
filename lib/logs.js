/**
 * Library for storing and rotating logs
 */

// Dependencies 
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container
const lib = {}
// Establish the base directory of the .logs folder, note __dirname variable is available in every node js file
// which references this module's current directory 
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file, create file if it does not exist
lib.append = function(file, str, callback) {
    // Open the file
    // using the 'a' param for appending, which will create the file if it does not exists
    fs.open(lib.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
        if(!err && fileDescriptor){
            // Append to the file and close it
            fs.appendFile(fileDescriptor, str+'\n', (err) => {
                if(!err){
                    // are using error back pattern
                    callback(false);
                } else {
                    callback('Error appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
}

lib.list = function(includeCompressedLogs, callback){
    fs.readdir(lib.baseDir, (err, data) => {
        if(!err && data && data.length > 0){
            const trimmedFileNames = [];
            data.forEach(fileName => {
                // Add the .log files
                if(fileName.indexOf('.log') > -1){
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                // Add on the .gz files
                if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs){
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
}

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId, newFileId, callback) {
    const sourceFile = logId + '.log';
    const destFile = newFileId + '.gz.b64';

    // Read the source file
    fs.readFile(lib.baseDir + sourceFile, 'utf8', (err, inputString) => {
        if(!err && inputString) {
            // Compress the data using gzip
            zlib.gzip(inputString, (err, buffer) => {
                if(!err && buffer) {
                    // send data to destination file
                    fs.open(lib.baseDir+destFile,'wx', (err, fileDescriptor) => {
                        if(!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                                if(!err) {
                                    // Closee the destintion file
                                    fs.close(fileDescriptor, (err) => {
                                        if(!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        };
                                    });
                                } else {
                                    callback(err);
                                };
                            });
                        } else {
                            callback(err);
                        };
                    });
                } else {
                    callback(err);
                };
            });
        } else {
            callback(err);
        };
    });
};
  
// Decompress the contents of a .gz file into a string variable
lib.decompress = function (fileId, callback) {
    const fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir + fileName, 'utf8', (err, str) => {
        if (!err && str) {
            // Inflate the data
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) => {
                if (!err && outputBuffer) {
                    // Callback
                    const str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};
  
// Truncate a log file
lib.truncate = function (logId, callback) {
    fs.truncate(lib.baseDir + logId + '.log', 0, (err) => {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
};

// Export lib module
module.exports = lib;
