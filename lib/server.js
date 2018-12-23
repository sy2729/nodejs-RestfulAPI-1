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

    // If the request is within the public directory, use the public handler instead of the exact path
    chosenHandler =  trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;
 
     // Route the request to the handler specified in the router
     chosenHandler(data, function(statusCode, payload, contentType) {
        statusCode = typeof statusCode === 'number'? statusCode : 200;
 
        // Determin the type of response
        contentType = typeof contentType === 'string' ? contentType : 'json';
        



       //  return the response
       
       // return the response-part that are content-specific
       var payloadString = '';
       if(contentType === 'json') {
         res.setHeader('Content-Type', 'application/json');
         payload = typeof payload === 'object'? payload : {};
         payloadString = JSON.stringify(payload);
        }
        
        if(contentType === 'html') {
          res.setHeader('Content-Type', 'text/html');
          payloadString = typeof payload === 'string'? payload : '';
       }
        if(contentType === 'favicon') {
          res.setHeader('Content-Type', 'image/x-icon');
          payloadString = typeof payload !== 'undefined'? payload : '';
       }
        if(contentType === 'css') {
          res.setHeader('Content-Type', 'text/css');
          payloadString = typeof payload !== 'undefined'? payload : '';
       }
        if(contentType === 'png') {
          res.setHeader('Content-Type', 'image/png');
          payloadString = typeof payload !== 'undefined'? payload : '';
       }
        if(contentType === 'jpg') {
          res.setHeader('Content-Type', 'image/jpeg');
          payloadString = typeof payload !== 'undefined'? payload : '';
       }
        if(contentType === 'plain') {
          res.setHeader('Content-Type', 'text/plain');
          payloadString = typeof payload !== 'undefined'? payload : '';
       }
      
       // return the response-part that are common to all content-type
       res.writeHead(statusCode);
       res.end(payloadString)



      //  console.log('the payload string is ', statusCode, payloadString)
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
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checkList,
  'checks/create': handlers.checkCreate,
  'checks/edit': handlers.checksEdit,
  'api/ping': handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'favicon.ico' : handlers.favicon,
  'public' : handlers.public
};

// init script
server.init= function() {
  // start the HTTP server
  server.httpServer.listen(config.httpPort, function() {
    console.log('\x1b[36m%s\x1b[0m', `the server is listening on port ${config.httpPort} now` + `The environment name is ${config.envName}`)
  })

  // start the HTTPs server
  server.httpsServer.listen(config.httpsPort, function() {
    console.log('\x1b[35m%s\x1b[0m', `the server is listening on port ${config.httpsPort} now` + `The environment name is ${config.envName}`)
  })

}

module.exports = server