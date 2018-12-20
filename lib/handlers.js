
// dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require("../config");

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

/*
 *
 * HTML Handler
 * 
 *
*/
// index handler
handlers.index = function(data, callback) {
  if(data.method === 'get') {

    // Prepare data for interpolation
    var templateData = {
      'header.title' : 'this is the title',
      'header.description' : 'this is the meta description',
      'body.title' : 'hello tempalted world',
      'body.class' : 'index'
    }

    // read in a template as a string
    helpers.getTemplate('index', templateData, function(err, str) {
      if(!err && str) {
        // Add the header and footer
        helpers.addUniversalTemplates(str, templateData, function(err, str) {
          if(!err && str) {
            callback(200, str, 'html')
          }else {
            callback(500, undefined, 'html')
          }
        })
      }else {
        console.log(err)
        callback(500, undefined, 'html')
      }
    })
  }else {
    callback(405, undefined, 'html')
  }
  // callback(undefined, undefined, 'html')
}




/*
 *
 * JSON API Handler
 * 
 *
*/

// user handler
handlers.users = function(data, callback) {
  var acceptableMethod = ['post', 'get', 'put', 'delete'];
  if(acceptableMethod.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback)
  }else {
    callback(405) //405 - method not allowed
  }
}

handlers._users = {};

handlers._users.post = function(data, callback) {

  var firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim():false;
  var lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim():false;
  var phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim():false;
  var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim():false;
  var tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? data.payload.tosAgreement:false;
  

  if(firstName && lastName && phone && password && tosAgreement) {
    _data.read('users', phone, function(err, data) {
      if(err) {
        // hash the password - with crpto
        var hashPassword = helpers.hash(password);

        if(hashPassword) {
          var userObject = {firstName, lastName, phone, hashPassword, tosAgreement}
          // store the user
          _data.create('users', phone, userObject, function(err) {
            if(!err) {
              callback(200)
            }else {
              console.log(err);
              callback(500, {"Error": "Couldn't log out the user"});
            }
          })
        }else {
          callback(500, {'Error': 'Could not hash the user passwords'})
        }

      }else {
        callback(400, {'Error':'A user with that phone number already exist'})
      }
    })
  }else {
    callback(400, {'Error': 'missing required fields'})
  }
};

handlers._users.get = function(data, callback) {
  var phone = typeof(data.querySrting.phone) === 'string' && data.querySrting.phone.trim().length === 10 ? data.querySrting.phone.trim() : false;
  if(phone) {
    // get the token from the header
    var token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // verify the token is valid
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if(tokenIsValid) {
        // look up the user
        _data.read('users', phone, function(err, data) {
          if(!err && data) {
            // remove the hashedpassword from the user object before returning them to the user
            delete data.hashPassword;
            callback(200, data)
          }else {
            callback(404);
          }
        })
      }else {
        callback(403, {"Error": "Missing required Token in header or the token is invalid"})
      }
    })
  }else {
    callback(400, {"Error": "Missing required Feild"})
  }
};

// Optional Data: firstName/lastName, password, at least one must be specified
handlers._users.put = function(data, callback) {
  // check for the required field
  var phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

  // check for optional fields
  var firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim():false;
  var lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim():false;
  var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim():false;

  // Error if the phone is invalid - only allow to update with correct phone
  if(phone) {

    // Error if nothing to update
    if(firstName || lastName || password) {

      var token = typeof data.headers.token === 'string' ? data.headers.token : false;
      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if(tokenIsValid) {
            // look up the user
          _data.read('users', phone, function(err, userData) {
            if(!err && userData) {
              // update the info
              if(firstName) {
                userData.firstName = firstName;
              }
              if(lastName) {
                userData.lastName = lastName;
              }
              if(password) {
                userData.password = helpers.hashPassword(password);
              }

              // store the new info
              _data.update('users', phone, userData, function(err) {
                if(!err) {
                  callback(200)
                }else {
                  console.log(err)
                  callback(500, {"Error": 'Having issue update the user info'})
                }
              })

            }else {
              callback(400, {"Error": 'The specified user doesn\'t exist'})
            }
          })
        }else {
          callback(403, {"Error": "Missing required Token in header or the token is invalid"})
        }
      });
    }else {
      callback(400, {"Error": 'Missing info to update'})
    }

  } else {
    callback(400, {"Error": 'Missing required field'})
  }

};

// @Todo - delete other info related to the user
handlers._users.delete = function(data, callback) {
  // first get the user info
  var phone = typeof(data.querySrting.phone) === 'string' && data.querySrting.phone.trim().length === 10 ? data.querySrting.phone.trim() : false;

  if(phone) {
    var token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // verify the token is valid
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if(tokenIsValid) {
        // look up the user
        _data.read('users', phone, function(err, userData) {
          if(!err && userData) {
            _data.delete('users', phone, function(err) {
              if(!err) {
                // Delete user successfully, now need to also delete all check files that is related to this user
                var checkList = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                var needToDelete = checkList.length;
                if(needToDelete > 0) {
                  var deleteError = false;
                  var deleted = 0;
                  checkList.forEach(function(i) {
                    _data.delete('checks', i, function(err) {
                      if(err) {deleteError = true;}
                      deleted++;
                      if(deleted === needToDelete) {
                        if(!deleteError) {
                          callback(false)
                        }else {
                          callback(500, {"Error": "Error encounted when trying to delete all checks from the users check list, not all check files might be able to be deleted"})
                        }
                      }
                    })
                  })
                }else {
                  callback(false)
                }

                // callback(200)
              }else {
                callback(500, {"Error": "Could not delete the specified user"})
              }
            })
          }else {
            callback(404, {"Error": "Can not find the specified user"});
          }
        })
      }else {
        callback(403, {"Error": "Missing required Token in header or the token is invalid"})
      }
    })
  }else {
    callback(400, {"Error": "Missing required Feild"})
  }
};

handlers.tokens = function(data, callback) {
  var acceptableMethod = ['post', 'get', 'put', 'delete'];
  if(acceptableMethod.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback)
  }else {
    callback(405) //405 - method not allowed
  }
}
handlers._tokens = {};

// need phone and password
handlers._tokens.post = function(data, callback) {
  var phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim():false;
  var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim():false;
  if(phone && password) {
    // look up the user
    _data.read('users', phone, function(err, data) {
      if(!err && data) {
        // hash the sent password
        if(helpers.hash(password) === data.hashPassword) {
          // if match, create the token for the user, and set the expired time
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60
          var tokenObject = {phone, id: tokenId, expires};

          // store the token
          _data.create('tokens', tokenId, tokenObject, function(err){
            if(!err) {
              callback(200, tokenObject)
            }else {
              callback(500, {"Error": "Could not create the token"})    
            }
          })

        }else {
          callback(400, {"Error": "Password does not match the specified user password"})
        }
      }else {
        callback(400, {"Error": "Could not find specified user"})
      }
    })
  }else {
    callback(400, {"Error": "Missing required fields"})
  }
};
// required id
handlers._tokens.get = function(data, callback) {
  var id = typeof(data.querySrting.id) === 'string' && data.querySrting.id.trim().length === 20 ? data.querySrting.id.trim() : false;

  if(id) {
    // look up the user
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
       callback(200, tokenData) 
      }else {
        callback(404);
      }
    })
  }else {
    callback(400, {'Error': "Missing required fileds"})
  }
    
};

// required info: id and extend
handlers._tokens.put = function(data, callback) {
  var id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim():false;
  var extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? data.payload.extend:false;

  if(id && extend) {
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        // make sure the token is not expired
        if(tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // store the date back
          _data.update('tokens', id, tokenData, function(err) {
            if(!err) {
              callback(200)
            }else {
              callback(500, {"Error": "Could not update the token expirations"})    
            }
          })
        }else {
          callback(400, {"Error": "The token has already expried and cannot be extended"})      
        }
      }else {
        callback(400, {"Error": "The specified token id is not found"})    
      }
    })
  }else {
    callback(200, {"Error": "Missing required fields or fields are invalid"})
  }
};
handlers._tokens.delete = function(data, callback) {
  var id = typeof(data.querySrting.id) === 'string' && data.querySrting.id.trim().length === 20 ? data.querySrting.id.trim():false;

  if(id) {
    // look up the user
    _data.read('tokens', id, function(err, data) {
      if(!err && data) {
        _data.delete('tokens', id, function(err) {
          if(!err) {
            callback(200)
          }else {
            callback(500, {"Error": "Could not delete the specified id"})
          }
        })
      }else {
        callback(404, {"Error": "Can not find the specified user"});
      }
    })
  }else {
    callback(400, {"Error": "Missing required Feild"})
  }
};

// verify if the given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  // look up the token
  _data.read('tokens', id, function(err, tokenData) {
    if(!err && tokenData) {
      if(tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true)
      }else {
        callback(false)  
      }
    }else {
      callback(false)
    }
  })
}




// Checks
handlers.checks = function(data, callback) {
  var acceptableMethod = ['post', 'get', 'put', 'delete'];
  if(acceptableMethod.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback)
  }else {
    callback(405) //405 - method not allowed
  }
}

handlers._checks = {};

// required data : url, protocol, methods, successCode, timeoutSecond
handlers._checks.post = function(data, callback) {
  var protocol = typeof(data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol.trim()) > -1 ? data.payload.protocol.trim():false;
  var url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) === 'string' && ['post', 'put', 'get', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCode = typeof(data.payload.successCode) === 'object' && data.payload.successCode instanceof Array && data.payload.successCode.length > 0 ? data.payload.successCode:false;
  var timeoutSecond = typeof(data.payload.timeoutSecond) === 'number' && data.payload.timeoutSecond % 1 === 0 && data.payload.timeoutSecond >= 1 && data.payload.timeoutSecond <=5 ? data.payload.timeoutSecond : false;

  if(protocol && url && method && successCode && timeoutSecond) {
    // get the token from the header
    var tokenId = typeof (data.headers.token) === "string" ? data.headers.token : false

    // lookup the token Data
    _data.read('tokens', tokenId, function(err, tokenData) {
      if(!err && tokenData) {
        var phone = tokenData.phone;

        // look up the userData with the phone number get from the tokenData
        _data.read('users', phone, function(err, userData) {
          if(!err && userData) {
            var userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
            // check the userChecks amount is less than the maxChecks limitation
            if(userChecks.length < config.maxChecks) {
            // create a randomId for the check
            var checkId = helpers.createRandomString(20);

            // create a check object
            var checkObject = {
              "id": checkId,
              "userPhone": phone,
              protocol,
              method,
              url,
              successCode,
              timeoutSecond
            }

            // save object to checks file
            _data.create('checks', checkId, checkObject, function(err) {
              if(!err) {
                // add the checkId to the user object
                userData.checks = userChecks;
                userData.checks.push(checkId);

                // save the new checks data back to userData
                _data.update('users',phone, userData, function(err) {
                  if(!err) {
                    callback(200, checkObject)
                  }else {
                    callback(500, {"Error": "could not update the user check data"})
                  }
                })
              }else {
                callback(500, {"Error":"Could not create the new check"})
              }
            })

            }else {
              callback(400, {"Error": `the user already has maximum number of checks (${config.maxChecks})`})
            }
          }else {
            callback(403)
          }
        })
      }else {
        callback(403)
      }
    })

  }else {
    callback(400, {"Error": "Missing reuqest inputs or inputs are valid"})
  }
}

handlers._checks.get = function(data, callback) {
  var id = typeof (data.querySrting.id) === 'string' && data.querySrting.id.length === 20 ? data.querySrting.id : false;
  
  if(id) {
    // lookup the check, figure out who make the check
    _data.read('checks', id, function(err, checkData) {
      if(!err && checkData) {
        // get the token from the header
        var token = typeof data.headers.token === 'string' ? data.headers.token : false;
        // verify the token is valid
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if(tokenIsValid) {
            // now the user is validated, so just return the checkData
            callback(200, checkData)
          }else {
            callback(403, {"Error": "Missing required Token in header or the token is invalid"})
          }
        })
      }else {
        callback(404)
      }
    })

  }else {
    callback(400, {"Error": "Missing required Feild"})
  }
}

// put - id required; 
// optional data: any of other data at least required for one
handlers._checks.put = function(data, callback) {
  // check for required data
  var id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  // check for optional data
  var protocol = typeof(data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol.trim()) > -1 ? data.payload.protocol.trim():false;
  var url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) === 'string' && ['post', 'put', 'get', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCode = typeof(data.payload.successCode) === 'object' && data.payload.successCode instanceof Array && data.payload.successCode.length > 0 ? data.payload.successCode:false;
  var timeoutSecond = typeof(data.payload.timeoutSecond) === 'number' && data.payload.timeoutSecond % 1 === 0 && data.payload.timeoutSecond >= 1 && data.payload.timeoutSecond <=5 ? data.payload.timeoutSecond : false;

  // check to make sure id is valid
  if(id) {
    if (protocol || url || method || successCode || timeoutSecond) {
      _data.read("checks", id, function(err, checkData) {
        if(!err && checkData) {
          // get the token from the header
          var token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
          // verify the token is valid
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
            if(tokenIsValid) {
              // now the user is validated, so update the check where it is necessary
              if(protocol) {
                checkData.protocol = protocol;
              };
              if(url) {
                checkData.url = url;
              };
              if(method) {
                checkData.method = method;
              };
              if(successCode) {
                checkData.successCode = successCode;
              };
              if(timeoutSecond) {
                checkData.timeoutSecond = timeoutSecond;
              };

              // after updating, save the data back to check file
              _data.update('checks', id, checkData, function(err) {
                if(!err) {
                  callback(false)
                }else {
                  callback(500, {"Error": "Could not update the check info"})
                }
              })
            }else {
              callback(403, {"Error": "Missing required Token in header or the token is invalid"})
            }
          })
        }else {
          callback(400, {"Error": "Check Id does not exist"})
        }
      })
    }else {
      callback(400, {"Error": "Missing Data to update"})
    }
  }else {
    callback(400, {"Error": "Missing required fields"})
  }
}

// delete checks - id required - first delete check then delete user check record in user data
handlers._checks.delete = function(data, callback) {
  var id = typeof(data.querySrting.id) === 'string' && data.querySrting.id.trim().length === 20 ? data.querySrting.id.trim():false;
  if(id) {
    // look up the check
    _data.read('checks', id, function(err, checkData) {
      if(!err && checkData) {
        // first validate the user identity for deletion
        // get the token from the header
        var token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
        // verify the token is valid
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if(tokenIsValid) {
            _data.delete('checks', id, function(err) {
              if(!err) {
                // now delete the check successfully, need to delete the check record in userData;
                _data.read('users', checkData.userPhone, function(err, userData) {
                  if(!err && userData) {
                    // get the check list Data from the userData;
                    var userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // remove the deleted check from th check list
                    var checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      // resave the userData back to file
                      _data.update("users", checkData.userPhone, userData, function(err) {
                        if(!err) {
                          callback(false)
                        }else {
                          callback(500, {"Error": "Could not update the user check info"})    
                        }
                      })
                    }else {
                      callback(500, {"Error": "Could not find that check on the user object, so could not remove it"})
                    }
                  }else {
                    callback(500, {"Error": "Could not find the user of the deleted check"})
                  }
                })
              }else {
                callback(500, {"Error": "Could not delete the specified check"})
              }
            })
          }else {
            callback(403, {"Error": "Missing verified token or the token is not valid"})
          }  
        })
      }else {
        callback(404, {"Error": "Can not find the specified check"});
      }
    })
  }else {
    callback(400, {"Error": "Missing required Feild"})
  }
}

// not found handlers
handlers.notFunder = function(data, callback) {
  callback(404)
}

module.exports = handlers