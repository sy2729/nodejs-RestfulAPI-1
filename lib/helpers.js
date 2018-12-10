// Dependencies
var crypto = require('crypto');
var config = require('../config');
var https = require('https');
var querystring = require('querystring');

// just helpers for various tasks
var helpers = {};

helpers.hash = function(str) {
  if (typeof str === 'string' && str.length > 0) {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex') //hashing the password
    return hash;
  }else {
    return false
  }
}

helpers.parseJSONToObject = function(str) {
  try {
    return JSON.parse(str)
  }catch(e) {
    return {}
  }
};

helpers.createRandomString = function(num) {
  var strLengh = typeof num === "number" && num > 0 ? num : false;
  if(strLengh) {
    var str = '';
    var all = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for(var i = 0; i < strLengh; i++) {
      var index = Math.floor(Math.random()*all.length);
      str = str + all[index]
    }
    return str;
  }else {
    return false
  }
}

// Send SMS message
helpers.sendTwilioSms = function(phone, msg, callback) {
  // validate parameters
  phone = typeof(phone) === 'string' && phone.length === 10? phone : false;
  msg = typeof(msg) === 'string' && msg.trim().length > 0 && msg.trim().length <= 1600? msg.trim() : false;

  if(phone && msg) {
    // configure the request payload
    var payload = {
      'From': config.twilio.fromPhone,
      "To": "+1"+phone,
      "Body": msg
    };

    // stringify the payload
    var stringPayload = querystring.stringify(payload);
    // Configure the request details
    var requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': "POST",
      'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      'auth': config.twilio.accountSid+":"+config.twilio.authToken,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-length': Buffer.byteLength(stringPayload)
      }
    }

    // instantiate the request
    var req = https.request(requestDetails, function(res) {
      var status = res.statusCode;
      if(status === 200 || status === 201) {
        callback(false);
      }else {
        callback('status Code returned was' + status)
      }
    });

    // bind to error event
    req.on('error', function(e) {
      callback(e)
    })

    // add the payload
    req.write(stringPayload);

    // end the request
    req.end();

  }else {
    callback("Giving parameters are missing or invalid")
  }
}





module.exports = helpers;