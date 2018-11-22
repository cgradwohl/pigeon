/**
 * Library used for storing and editing data
 */

 // Dependancies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');


// Container for the module (to be exported)
const lib = {};

// Base directory of the data folder, note __dirname variable is available in every node js file
// which references this files current directory 
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = function(dir, file, data, callback) {
    // open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', (err, desc) => {
        if(!err && desc){
            // convert data to string
            const stringData = JSON.stringify(data);
``
            // write to file and close it
            fs.writeFile(desc, stringData, (err) => {
                if(!err){
                    fs.close(desc, (err) => {
                        if(!err){
                            callback(false);
                        } else {
                            callback("Error closing new file.");
                        }
                    });
                } else {
                    callback("Error writing new file.");
                }
            });
        } else {
            callback("Could not create new file, it may already exist.");
        }
    });
};

// Read data from a file
lib.read = function(dir, file, callback) {
    fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf8', (err, data) => {
        if(!err && data){
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    });
};

// Update data inside a file
lib.update = function(dir, file, data, callback) {
    // Open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', (err, desc) => {
        if(!err && desc){
            const stringData = JSON.stringify(data);

            // truncate the file
            fs.truncate(desc, (err) => {
                if(!err){
                    // write to the file and close it
                    fs.writeFile(desc, stringData, (err) => {
                        if(!err){
                            fs.close(desc, (err) => {
                                if(!err) {
                                    callback(false);
                                } else {
                                    callback("Could not close new file.")
                                }
                            });
                        } else {
                            callback("Could not write to file.")
                        }
                    })

                } else {
                    callback("Could not truncate the file.")
                }
            })
        } else {
            callback("Could not create new file for updating, it may not exist.")
        }
    });
};

lib.delete = function(dir, file, callback) {
    // open the file

    // unlink the file from the fs
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', (err) => {
        if(!err){
            callback(false);
        } else {
            callback('Could not delete file.')
        }
    })
};


// Export the module
module.exports = lib;