/**
 * Primary file for API 
 */

// native nodejs dependancies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// instantiate the HTTP server
const httpServer = http.createServer(function(req, res) {
    unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, function() {
    console.log("the server is listening on port: ", config.httpPort);
});

// instantiate the HTTPS server
const httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
};
const httpsServer = http.createServer(httpsServerOptions, function(req, res) {
    unifiedServer(req, res);
});

// Start the HTTPS server 
httpsServer.listen(config.httpsPort, function() {
    console.log("the server is listening on port: ", config.httpsPort);
});


// All the server logic for both http and https server
const unifiedServer = function(req, res) {
    // get the url and parse it
    const parsedUrl = url.parse(req.url, true);
    
    // get the path form that url
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // get the query string as an object
    const queryStringObj = parsedUrl.query;

    // get the http method
    const method = req.method.toLowerCase();

    // get the headers as an object
    const headers = req.headers;

    // get the payload, if payload exists
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    
    // payload of the req is being streamed in via the 'data' event
    // this is a node js WritableStream instance 
    req.on('data', function(data) {
        buffer += decoder.write(data)
    });

    // end gets called for every request regardless if it has payload
    req.on('end', function() {
        buffer += decoder.end();

        // choose the handler this req should go to 
        const chosenHandler = typeof(router[trimmedPath]) == 'undefined' ? handlers.notFound : handlers[trimmedPath];
        
        // Create the request data obj to send to handler
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObj': queryStringObj,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }

        // Handle the request
        chosenHandler(data, (statusCode, payload) => {
            // use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            
            // use the payload called back by the handler, or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // convert the payload to a string
            const payloadString = JSON.stringify(payload);

            // return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log("returning the response", statusCode, payloadString);
        }); 
    });
}

// define a request router
const router = {
    'ping' : handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens
}