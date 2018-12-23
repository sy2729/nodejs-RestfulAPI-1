/*
* App for the front end logics
*/

// Container
var app = {}

// Config
app.config = {
  'sessionToken' : false
}

// Ajax Client for the restful API
app.client = {};

// Interface for making API Call
app.client.request = function(headers, path, method, queryStringObject, payload, callback){
  // set default
  headers = typeof headers === 'object' && headers !== null ? headers : {};
  path = typeof path === 'string' ? path : '/';
  method = typeof method === 'string' && ["POST", "GET", "PUT", "DELETE"].indexOf(method) > -1 ? method.toUpperCase() : "GET";
  queryStringObject = typeof queryStringObject === 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof payload === 'object' && payload !== null ? payload : {};
  callback = typeof callback === 'function' ? callback : false;

  // for each query String parameter sent, add it to the path;
  var requestUrl = path + '?';
  var counter = 0;
  for (var queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at least on query string parameters has already been added, prepend new one with &
      if(counter > 1) {
        requestUrl +='&'
      }
      // Add the key value
      requestUrl += queryKey + '=' + queryStringObject[queryKey]
    }
  }
  
  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // For Each Header sent, add it to the request one by one
  for (var headerKey in headers) {
    if(headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // if there is a current session token set, add that as a header
  if(app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // when the request comes back, handle the response
  xhr.onreadystatechange = function() {
    if(xhr.readyState === XMLHttpRequest.DONE) {
      var statusCode = xhr.status;
      var response = xhr.response.text;

      // Call back if requested
      if(callback) {
        try {
          var parsedResponse = JSON.parse(response);
          callback(statusCode, parsedResponse)
        }catch(e) {
          callback(status, false)
        }
      }
    }
  }
  // Send the payload as JSON
  var payloadString = JSON.stringify(payload)
  xhr.send(payloadString)
}



