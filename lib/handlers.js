/**
 * Request Handlers
 */

// Dependencies 
const _data = require('./data');
const helpers = require('./helpers');

// Handlers container
const handlers = {};

// Not found handler
handlers.notFound = function(data, callback) {
    callback(404);
};

// Ping handler
handlers.ping = function(data, callback) {
    callback(200)
};

// Users handler
handlers.users = function(data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    } else {
        callback(405);    
    }
};

// Container for users sub methods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback) {
    // Check that all required fields are filled out
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false; 
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && tosAgreement) {
        // Make sure user doesn't already exist 
        _data.read('users', phone, (err, data) => {
            if(err){
                // Hash the password
                const hashedPassword = helpers._hash(password);
                
                if(hashedPassword) { 
                    // Create user object
                    const userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone':phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    }

                    _data.create('users', phone, userObject, (err) => {
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'A user'})
                        }
                    });
                } else {
                    callback(500, {'Error': 'Could not hash the password.'})
                }
            } else {
                callback(400, {'Error':'A user with that phone number already exists.'});
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields.'})
    }

};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObj.phone) == 'string' && data.queryStringObj.phone.trim().length == 10 ? data.queryStringObj.phone.trim() : false;
    if(phone) {

        // Get the token form the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (validToken) => {
            if(validToken){
                // Lookup the user
                _data.read('users', phone, (err, record) => {
                    if(!err && data){
                        // remove the hashed password from the user object before returning it to the requeser
                        delete record.hashedPassword;
                        callback(200, record);
                    } else {
                        callback(404, {'Error': "Record not found."});
                    }
                });
            } else {
                callback(403, {'Error' : 'Missing required token in header.'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing phone number or invalid data.'})
    }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback) {
    // check for required field
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    
    // Check for the optional fields
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false; 
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    // Error if the phone is invalid
    if(phone) {
        // Error of nothing is sent to update
        if(firstName || lastName || password) {
             // Get the token form the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, (validToken) => {
                if(validToken){ 
                    // lookup the user
                    _data.read('users', phone, (err, record) => {
                        if(!err && record) {
                            // Update the fields
                            if(firstName){
                                record.firstName = firstName;
                            }
                            if(lastName){
                                record.lastName = lastName;
                            }
                            if(password){
                                record.hashedPassword = helpers.hash(password);
                            }

                            // Store new updates, persisit to disk
                            _data.update('users', phone, record, (err) => {
                                if(!err){
                                    callback(200);
                                } else {  
                                    console.log(err);  
                                    callback(500, {'Error': 'Could not update the user'});
                                }
                            })
                        } else {
                            callback(400, {'Error': 'The specified user does not exist'});
                        }
                    });
                } else {
                    callback(403, {'Error' : 'Missing required token in header.'});
                }
            });
        } else {
            callback(400, {'Error': 'Missing fields to update.'});
        }
    } else {
        callback(400, {'Error': 'Missing required field'});
    }

}; 

// Users - delete
// Required data: phone
// Optional data: none
handlers._users.delete = function(data, callback){
    // Check that phone number is valid
    var phone = typeof(data.queryStringObj.phone) == 'string' && data.queryStringObj.phone.trim().length == 10 ? data.queryStringObj.phone.trim() : false;
    if(phone){
        // Get the token form the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (validToken) => {
             if(validToken){  
                // Lookup the user
                _data.read('users', phone, (err,data) => {
                    if(!err && data){
                        _data.delete('users', phone, (err) => {
                            if(!err){
                                callback(200);
                            } else {
                                callback(500,{'Error' : 'Could not delete the specified user'});
                            }
                        });
                    } else {
                        callback(400,{'Error' : 'Could not find the specified user.'});
                    }
                });
            } else {
                callback(403, {'Error' : 'Missing required token in header.'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field'})
    }
}; 


// Token handler
handlers.tokens = function(data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);    
    }
}

// Container for tokens sub methods
handlers._tokens = {}

// Tokens - post
// Required data : phone, password
// Optional data : None
handlers._tokens.post = function(data, callback) {
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password) {
        // Lookup the user who matches that phone number
        _data.read('users', phone, (err, record) => {
            if(!err && record) {
                // has the sent password and compare to the pw in the record
                const hashedPassword = helpers._hash(password)
                if(hashedPassword == record.hashedPassword){
                    // create new token with random name, set exp for 1 hour
                    const tokenId = helpers.createRandomString(20);
                    const exp = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': exp
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if(!err){
                            callback(200, tokenObject)
                        } else {
                            callback(500, {'Error': 'Could not create new token'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'Password is invalid.'})
                }
            } else {
                callback(400, {'Error': 'Could not find the user.'})
            }
        });
    } else {    
        callback(400, {'Error': 'Missing required fields.'})
    }
}

// Tokens - get
// Required data : id
// Optional data : None
handlers._tokens.get = function(data, callback) {
      // Check that the id number is valid
      const id = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == 20 ? data.queryStringObj.id.trim() : false;
      if(id) {
          // Lookup the user
          _data.read('tokens', id, (err, record) => {
              if(!err && record){
                  // remove the hashed password from the user object before returning it to the requeser
                  callback(200, record);
              } else {
                  callback(404, {'Error': "Record not found."});
              }
          });
      } else {
          callback(400, {'Error': 'Missing fields or invalid data.'})
      }
}

// Tokens - put
// Required data : id, extend
// Optional data : None
handlers._tokens.put = function(data, callback) {
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    
    // Check if request has id and extend is in the payload
    if(id && extend) {
        _data.read('tokens', id, (err, record) => {
            if(!err && record) {
                // Check a valid token exists
                if(record.expires > Date.now()){
                    record.expires = Date.now() + 1000 * 60 * 60;

                    _data.update('tokens', id, record, (err) => {
                        if(!err){
                            callback(200);
                        } else {
                            callback(500, {'Error' : 'Cannot update token expiration.'});
                        }
                    })
                } else {
                    callback(400, {'Error' : 'Token is expired'});
                }
            } else {
                callback(400, {'Error': 'Could not find the specified token.'})
            }
        });
         
    } else {
        callback(400, {'Error': 'Missing required field.'})
    }
    
}

// Tokens - delete
// Required data : id
// Optional data : none
handlers._tokens.delete = function(data, callback) {
    // Check that phone number is valid
    var id = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == 20 ? data.queryStringObj.id.trim() : false;
    if(id){
        // Lookup the user
        _data.read('tokens', id, (err,data) => {
            if(!err && data){
                _data.delete('tokens', id, (err) => {
                    if(!err){
                        callback(200);
                    } else {
                        callback(500,{'Error' : 'Could not delete the specified token.'});
                    }
                });
            } else {
                callback(400,{'Error' : 'Could not find the specified token.'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field.'})
    }
}

// Tokens - verifyToken
// Required data : id, phone
// Optional data : none
handlers._tokens.verifyToken = function(id, phone, callback) {
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData) {
            // check token ,matches phone
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false)
        }
    });
}

// Export handlers module
module.exports = handlers;