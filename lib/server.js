/**
 * This file is used to configure the server, start it, and have it listen on a port.
 * This file listens for a request, handles that request and then formats a response.
 */
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

// Instantiate the server object
const server = {};

// instantiate the HTTP server
server.httpServer = http.createServer(function(req, res) {
    server.unifiedServer(req, res);
});

// instantiate the HTTPS server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = http.createServer(server.httpsServerOptions, function(req, res) {
    server.unifiedServer(req, res);
});




// All the server logic for both http and https server
server.unifiedServer = function(req, res) {
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
        const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
        
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
server.router = {
    'ping' : handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
}


server.init = function() {
    // Start the HTTP server
    server.httpServer.listen(config.httpPort, function() {
        console.log('\x1b[36m%s\x1b[0m', "the server is listening on port: "+config.httpPort);
    });

    // Start the HTTPS server 
    server.httpsServer.listen(config.httpsPort, function() {
        console.log('\x1b[35m%s\x1b[0m', "the server is listening on port: "+config.httpsPort);
    });
}

module.exports = server;