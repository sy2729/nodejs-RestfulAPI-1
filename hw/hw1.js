const http = require('http');

const url = require('url');

var server = http.createServer(function(req, res) {

  let parsedUrl = url.parse(req.url, true);

  req.on('data', function(e) {
    console.log(a)
  })
  req.on('end', function() {
    console.log(parsedUrl)
    res.end('hello world')
  })
  
})


server.listen(3000, function() {
  console.log('listen on 3000')
})