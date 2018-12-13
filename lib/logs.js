/*
*
*This is a library for rotating and storing logs
*
*/

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');


var lib = {};

lib.path = path.join(__dirname, '../.logs/')

// Append a file if it already exist, create the file it doesn't exist
lib.append = function(file, str, callback) {
  fs.open(lib.path + file + '.log', 'a', function(err, fileDescriptor) {
    if(!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, str + '\n', function(err) {
        if(!err) {
          fs.close(fileDescriptor, function(err) {
            if(!err) {
              callback(false)
            }else {
              callback("Error closing the file that is being appended")
            }
          })
        }else {
          callback("Error appending to file")    
        }
      })
    }else {
      callback("Could not open the file for appending")
    }
  })
}


// List all files, and optionally includes compressed logs
lib.list = function(includeCompressedFileLogs, callback) {
  fs.readdir(lib.path, function(err, data) {
    if(!err && data && data.length > 0) {
      var trimmedFileNames = [];
      data.forEach(function(fileName) {
        // add the log file
        if(fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''))
        }

        // add on the .gz file
        if(fileName.indexOf('.gz.b64') > -1 && includeCompressedFileLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedFileNames)
    }else {
      callback(err, data)
    }
  })
}

// Compress the content of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId, newFileId, callback) {
  var sourceFile = logId + '.log';
  var destFile = newFileId + '.gz.b64';

  // Read the source file
  fs.readFile(lib.path + sourceFile, 'utf-8', function(err, inputString) {
    if(!err && inputString) {
      // Compress the string
      zlib.gzip(inputString, function(err, buffer) {
        if(!err && buffer) {
          // Send the data to the destination file
          fs.open(lib.path + destFile, 'wx', function(err, fileDescriptor) {
            if(!err && fileDescriptor) {
              // use the built-in function of buffer - buffer.toString()
              fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                if(!err) {
                  // Close the destination file
                  fs.close(fileDescriptor, function(err) {
                    if(!err) {
                      callback(false);
                    }else {
                      callback(err)
                    }
                  })
                }else {
                  callback(err)
                }
              })
            }else {
              callback(err)
            }
          })
        }else {
          callback(err)
        }
      })
    }else {
      callback(err)
    }
  })
};

// Decompress the content of a .gz.b64 file into a string variable
lib.decompress = function(fileId, callback) {
  var fileName = fileId + '.gz.b64';
  fs.readFile(lib.path + fileName, 'utf-8', function(err, string) {
    if(!err && string) {
      // Decompress the data
      var inputBuffer = Buffer.from(string, 'base64');
      zlib.unzip(inputBuffer, function(err, outputBuffer) {
        if(!err && outputBuffer) {
          // Callback
          var str = outputBuffer.toString();
          callback(false, str)
        }else {
          callback(err)
        }
      })
    }else {
      callback(err)
    }
  })
};

lib.truncate = function(logId, callback) {
  fs.truncate(lib.path + logId + '.log', 0, function(err) {
    if(!err) {
      callback(false)
    }else {
      callback(err)
    }
  })
}



module.exports = lib;