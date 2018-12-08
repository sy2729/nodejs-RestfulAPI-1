/*
primary file for the API
*/

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');

var _data = require('./lib/data')

// test
// ----------create-----------
// _data.create('test', 'newFile', {name: 'shuai', age: 23}, function(err, e) {
//   console.log(err, e);
// })
// ----------read-----------
// _data.read('test', 'newFile', function(err, data) {
//   console.log(err, data);
// })
// ----------update-----------
// _data.update('test', 'newFile', {name: 'yujie zhang', age: 23}, function(err, data) {
//   console.log(err, data);
// })
// ----------delete-----------
// _data.delete('test', 'newFile', function(err, data) {
//   console.log(err, data);
// })




// Instatiate the HTTP server
var httpServer = http.createServer(function(req, res) {
  unifiedServer(req, res)
});
// Instatiate the HTTPS server
var httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
}
var httpsServer = https.createServer(httpsServerOptions, function(req, res) {
  unifiedServer(req, res)
});



// start the HTTP server
httpServer.listen(config.httpPort, function() {
  console.log(`the server is listening on port ${config.httpPort} now`)
  console.log(`The environment name is ${config.envName}`)
})
// start the HTTPs server
httpsServer.listen(config.httpsPort, function() {
  console.log(`the server is listening on port ${config.httpsPort} now`)
  console.log(`The environment name is ${config.envName}`)
})

// all the server logic for both the http and https
var unifiedServer = function(req, res) {
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
     var chosenHandler = typeof(router[trimmedPath]) !== 'undefined'?router[trimmedPath]:handlers.notFunder;
 
     // construct the data object to send to the handler
     var data = {
       'trimmedPath': trimmedPath,
       'querySrting': queryStringObject,
       'method': method,
       'headers': headers,
       'payload': buffer,
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



// define the handlers
var handlers = {};

// sample handlers
// handlers.sample = function(data, callback) {
//   // callback a http status code, and a payload object
//   callback(406, {'name': 'sample handlers'})
// };

// ping handler
handlers.ping = function(data, callback) {
  callback(200)
}

// not found handlers
handlers.notFunder = function(data, callback) {
  callback(404)
}

// define a request router
var router = {
  // 'sample': handlers.sample
  'ping': handlers.ping
};