// Dependencies
var fs = require('fs');
var path = require('path')
var helpers = require('./helpers')

// Container for the module (to be exported)
var lib = {}

// path varible
lib.path = path.join(__dirname, '../.data/')

// create file
lib.create = function (dir, file, data, callback) {
  fs.open(lib.path + dir + '/' + file + '.json', 'wx', function(err, fileDescriptor) {
    if(!err && fileDescriptor) {
      var stringData = JSON.stringify(data);
      
      fs.writeFile(fileDescriptor, stringData, function(err){
        if(!err) {
          fs.close(fileDescriptor, function(err) {
            if(!err) {
              callback(false)
            }else {
              callback('err closing the new file')
            }
          })
        }else {
          callback('err writing into the file', err)
        }
      })
    }else {
      callback("couldn't open the file in the system, it might already exist, the error is ", err)
    }
  })
}

// read file
lib.read = function(dir, file, callback) {
  fs.readFile(lib.path + dir + '/' + file + '.json', 'utf-8', function(err, data){
    if(!err && data) {
      var parsedData = helpers.parseJSONToObject(data);
      callback(false, parsedData)
    }else {
      callback(err, data)
    }
  })
}

// update file
lib.update = function(dir, file, data, callback) {
  fs.open(lib.path + dir + '/' + file + '.json', 'r+', function(err, fileDescriptor){
    if( !err && fileDescriptor) {
      var stringData = JSON.stringify(data);

      fs.truncate(fileDescriptor, function(err) {
        if(!err) {
          fs.writeFile(fileDescriptor, stringData, function(err){
            if(!err) {
              fs.close( fileDescriptor, function(err) {
                if(!err) {
                  callback(false)
                }else {
                  callback('closing file error', error)
                }
              })
            }else {
              callback('writing file error', err)
            }
          })
        }else {
          callback('truncate the file error', err)
        }
      })
    }else {
      callback('open file error', err)
    }
  })
}


// delete file
lib.delete = function(dir, file, callback ) {
  fs.unlink(lib.path + dir + '/' + file + '.json', function(err) {
    if(!err) {
      callback(false)
    }else {
      callback('delete file error' + err)
    }
  })
}

// list directory
lib.list = function(dir, callback) {
 fs.readdir(lib.path + dir + '/', function(err, data) {
  if(!err && data && data.length > 0) {
    var fileNames = [];
    data.forEach(function(i) {
      fileNames.push(i.replace('.json', ''));
    })
    callback(false, fileNames)
  }else {
    callback(err, data)
  }
 }) 
}

module.exports = lib