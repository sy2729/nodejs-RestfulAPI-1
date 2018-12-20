// Dependencies
var crypto = require('crypto');
var config = require('../config');
var https = require('https');
var querystring = require('querystring');
var path = require('path');
var fs = require('fs');

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

helpers.getTemplate = function(templateName, data, callback) {
  templateName = typeof templateName === 'string' && templateName.length > 0 ? templateName : false;
  data = typeof data === 'object' && data !== null ? data : {};
  if(templateName) {
    var templateDir = path.join(__dirname, '/../templates');
    fs.readFile(templateDir + '/' + templateName + '.html', 'utf-8', function(err,str) {
      if(!err && str && str.length > 0) {
        // do the interpoldation on the string before returning it
        var finalStr = helpers.interpolate(str, data)
        callback(false, finalStr)
      }else {
        callback('No template could be found')
      }
    })
  }else {
    callback('a valid template name is not specified')
  }
}

// Add the universal header and footer to the string, and pass provided data to the header and footer for interpolation
helpers.addUniversalTemplates = function(str, data, callback) {
  str = typeof str === 'string' && str.length > 0 ? str : '';
  data = typeof data === 'object' && data !== null ? data : {};

  //Get the header
  helpers.getTemplate('_header', data, function(err, headerStr) {
    if(!err && headerStr) {
      // get the footer
      helpers.getTemplate('_footer', data, function(err, footerStr) {
        if(!err && footerStr) {
          var fullStr = headerStr + str + footerStr;
          callback(false, fullStr)
        }else {
          callback("Could not find the footer template")
        }
      })
    }else {
      callback("Could not find the header template")
    }
  })
}

// Take a givens string and a data object, and find/replace all the keys within it
helpers.interpolate = function(str, data) {
  str = typeof str === 'string' && str.length > 0 ? str : '';
  data = typeof data === 'object' && data !== null ? data : {};

  // Add the template globals to the data object, prepending their key names with "globals"
  for(var keyname in config.templateGlobals) {
    if(config.templateGlobals.hasOwnProperty(keyname)) {
      data['global.' + keyname] = config.templateGlobals[keyname];
    }
  }

  // For each key in the data obj, insert its value into the string and the corresponding placeholder
  for(var key in data) {
    if(data.hasOwnProperty(key) && typeof (data[key]) === 'string') {
      var replace = data[key];
      var find = '{' + key + '}';
      str = str.replace(find, replace);
    }
  }
  return str

}


module.exports = helpers;