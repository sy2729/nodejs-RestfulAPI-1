/*
* Server related tasks
*/

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
var config = require('../config');
var handlers = require('./handlers');
var fs = require('fs');
var helpers = require('./helpers');

var path = require('path');

// Instantiate the server module object
var server = {};

// // remove
// helpers.sendTwilioSms('6462380612', 'Hello!', function(err) {
//   console.log(err)
// })




// Instatiate the HTTP server
server.httpServer = http.createServer(function(req, res) {
  server.unifiedServer(req, res)
});
// Instatiate the HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
}
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
  server.unifiedServer(req, res)
});


// all the server logic for both the http and https
server.unifiedServer = function(req, res) {
   // Get the url and parse it
   var parseUrl = url.parse(req.url, true);

   // Get the path from the url
   var path = parseUrl.pathname
   var trimmedPath = path.replace(/^\/+|\/+$/g, '')
 
   // Get the query string as an object
   var queryStringObject = parseUrl.query;
 
   // Get the HTTP Method
   var method = req.method.toLowerCase();
 
   // Get the headers as an object
   var headers = req.headers;
   
   // Get the payload if there is any
   var decoder = new StringDecoder('utf-8');
   var buffer = '';
   req.on('data',function(data) {
     buffer += decoder.write(data)
   })
   req.on('end',function() {
     buffer += decoder.end();
 
     // choose the handler this request should go to
     var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined'?server.router[trimmedPath]:handlers.notFunder;
 
     // construct the data object to send to the handler
     var data = {
       'trimmedPath': trimmedPath,
       'querySrting': queryStringObject,
       'method': method,
       'headers': headers,
       'payload': helpers.parseJSONToObject(buffer),
     };
 
     // Route the request to the handler specified in the router
     chosenHandler(data, function(statusCode, payload) {
        statusCode = typeof statusCode === 'number'? statusCode : 200;
        payload = typeof payload === 'object'? payload : {};
 
        var payloadString = JSON.stringify(payload);
 
       //  return the response
       res.setHeader('Content-Type', 'application/json');
       res.writeHead(statusCode);
       res.end(payloadString)
       console.log('the payload string is ', statusCode, payloadString)
     })
 
     // Send the response
     // res.end('hello world \n')
 
     // Log the request path
     // console.log('request received with this payload ', buffer);
     // console.log('Request received on this path: ' + trimmedPath + 'with the method ' + method + 'and with these querySrting parameters ', queryStringObject)
     // console.log('request received with these headers  ', headers)
   })
}





// define a request router
server.router = {
  // 'sample': handlers.sample
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
};

// init script
server.init= function() {
  // start the HTTP server
  server.httpServer.listen(config.httpPort, function() {
    console.log(`the server is listening on port ${config.httpPort} now`)
    console.log(`The environment name is ${config.envName}`)
  })

  // start the HTTPs server
  server.httpsServer.listen(config.httpsPort, function() {
    console.log(`the server is listening on port ${config.httpsPort} now`)
    console.log(`The environment name is ${config.envName}`)
  })

}

module.exports = server