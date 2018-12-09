// Dependencies
var crypto = require('crypto');
var config = require('../config');

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





module.exports = helpers;