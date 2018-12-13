/*
* Worker related files
*
*/

var path = require('path');
var fs = require('fs');
var http = require('http')
var https = require('https');
var helpers = require('./helpers');
var url = require('url');
var _data = require('./data');
var _logs = require('./logs');

// Instantiate the worker object
var workers = {};




workers.gatherAllChecks = function() {
  // get all the checks in the system;
  _data.list('checks', function(err, checks) {
    if(!err && checks && checks.length > 0) {
      checks.forEach(function(checkName) {
        // Read every Check Data
        _data.read('checks', checkName, function(err, originalCheckData) {
          if(!err && originalCheckData) {
            // pass it to the check validator, and let that function continue or log err as needed
            workers.validateCheckData(originalCheckData)
          }else {
            console.log('Error: Reading one of the check data')      
          }
        })
      })
    }else {
      console.log('Error: Could not find any checks to process')
    }
  })
};

// Sanity-Checking the check-data, check it before process it
workers.validateCheckData = function(originalCheckData) {
  originalCheckData = typeof originalCheckData === 'object' && originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof (originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim(): false;
  originalCheckData.userPhone = typeof (originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim(): false;
  originalCheckData.protocol = typeof (originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol: false;
  originalCheckData.url = typeof (originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim(): false;
  originalCheckData.method = typeof (originalCheckData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method: false;
  originalCheckData.successCode = typeof (originalCheckData.successCode) === 'object' && originalCheckData.successCode instanceof Array && originalCheckData.successCode.length > 0 ? originalCheckData.successCode: false;
  originalCheckData.timeoutSecond = typeof (originalCheckData.timeoutSecond) === 'number' && originalCheckData.timeoutSecond % 1 === 0 && originalCheckData.timeoutSecond >= 1 && originalCheckData.timeoutSecond <= 5 ? originalCheckData.timeoutSecond: false;


  // Set the key that may not be set if the worker has never seen this check before - state and lastCheck
  originalCheckData.state = typeof (originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state: 'down';
  originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // if all the checks pass, pass the dat along to the next step
  if(originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol
     && originalCheckData.url && originalCheckData.method && originalCheckData.successCode
      && originalCheckData.timeoutSecond) {

        workers.performCheck(originalCheckData)

  }else {
    console.log('Error: one of the check is properly formatted, so skip it');
  }
}

// Perform the check, send the original checkData and the outcome of the check process to the next step in the process
workers.performCheck = function(originalCheckData) {
  // Prepare the initial check outcome
  var checkOutcome = {
    'error': false,
    'responseCode': false
  };

  // Mark that outcome has not been sent yet
  var outcomSent = false;

  // parse the host name and path out of the originalCheckData
  var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  var hostname = parsedUrl.hostname;
  var path = parsedUrl.path;

  // Construct the request;
  var requestDetails = {
    protocol: originalCheckData.protocol + ':',
    hostname,
    'method': originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSecond * 1000
  };

  // instantiate the request object using either http / https module
  var _moduletoUse = originalCheckData.protocol === 'http' ? http : https;
  var req = _moduletoUse.request(requestDetails, function(res) {
    var status = res.statusCode;

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;

    if(!outcomSent) {
      workers.proccessCheckOutcome(originalCheckData, checkOutcome);
      outcomSent = true;
    }
  })

  // Bind to an error event so it doesn't get thrown;
  req.on('error', function(e) {
    // update the outcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': e
    };

    if(!outcomSent) {
      workers.proccessCheckOutcome(originalCheckData, checkOutcome);
      outcomSent = true;
    }
  });
  // bind to the timeout event
  req.on('timeout', function(e) {
    // update the outcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': 'timeout'
    };

    if(!outcomSent) {
      workers.proccessCheckOutcome(originalCheckData, checkOutcome);
      outcomSent = true;
    }
  });

  // end the request
  req.end();
}

// Process the checkOutcome, update the checkData as needed, trigger an alert if needed
// Special Logical accomendating a check that has never been checked before
workers.proccessCheckOutcome = function(originalCheckData, checkOutcome) {
  // Decide if the check is considered up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCode.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
  // Decide if an alert is wanted
  var alertWanted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
  
  // log the outcome
  var timeofCheck = Date.now()
  workers.log(originalCheckData, checkOutcome, state, alertWanted, timeofCheck)

  // update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeofCheck;

  _data.update('checks', newCheckData.id, newCheckData, function(err) {
    if(!err) {
      // Send the new check data to the next phase in the process if needed
      if(alertWanted) {
        workers.alertUserToStatusChange(newCheckData);
      }else {
        console.log("Error: Check outcome hasn't changed, no alert needed")
      }
    }else {
      console.log("Error trying to save update to one of the checks")
    }
  })
}

// Alert User as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
  var msg = 'Alert: Your Check for' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + "://" + newCheckData.url + ' is currently ' + newCheckData.state;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
    if(!err) {
      console.log('Success, user was alerted about the status change via sms', msg)
    }else {
      console.log("Error, could not send SMS alert to user who has a state change in their check");
    }
  })
}

// Log the file
workers.log = function(originalCheckData, checkOutcome, state, alertWanted, timeofCheck) {
  //Form the log data
  var logData = {
    'check': originalCheckData,
    'outcome': checkOutcome,
    'state': state,
    'alert': alertWanted,
    'time': timeofCheck
  };

  // convert data to a string
  var logString = JSON.stringify(logData);

  // Determine the name of the log file
  var logoFileName = originalCheckData.id;
  _logs.append(logoFileName, logString, function(err) {
    if(!err) {
      console.log("Logging to file success")
    }else {
      console.log("Logging to file failed")
    }
  })
}

workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, 1000*60)
};


// Rotate(Compress) the log files
workers.rotateLogs = function() {
  // List all the non compressed files log files
  _logs.list(false, function(err, logs) {    //false  - means list out just non-compressed log files
    if(!err && logs && logs.length > 0) {
      logs.forEach(function(logName) {
        // Compress the data to a different file
        var logId = logName.replace('.log', '');
        var newFileId = logId + '-' + Date.now();
        _logs.compress(logId, newFileId, function(err) {
          if(!err) {
            //truncating the log, empty everything in the original file
            _logs.truncate(logId, function(err) {
              if(!err) {
                console.log('Success, truncating the log files')
              }else {
                console.log('Error, truncating the log files')
              }
            })
          }else {
            console.log("Error: Compressing one of the files", err)
          }
        })
      })
    }else {
      console.log("Error, could not find any logs to rotate")
    }
  });

}

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function() {
  setInterval(function() {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24)
};

workers.init = function() {
  // execute all the check immediately
  workers.gatherAllChecks();

  // call a loop so the check will execute on their own
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loops so logs will be compressed later on
  workers.logRotationLoop();

}


module.exports = workers;