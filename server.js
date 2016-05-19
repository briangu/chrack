'use strict';
/* jshint esversion: 6 */

var http = require("http");
var ws = require("nodejs-websocket");
var fs = require("fs");
var path = require('path');

http.createServer(function (req, res) {
	fs.createReadStream("index.html").pipe(res)
}).listen(8080)

var server = ws.createServer(function (connection) {
	connection.nickname = null
	connection.on("text", function (str) {
		if (connection.nickname === null) {
			connection.nickname = str
			broadcast(str+" entered")
		} else
			broadcast("["+connection.nickname+"] "+str)
	})
	connection.on("close", function () {
		broadcast(connection.nickname+" left")
	})
})
server.listen(8081)

function broadcast(str) {
	server.connections.forEach(function (connection) {
		connection.sendText(str)
	})
}

var currentWatcher;
var currentFilesize = 0;

function startWatching(filename) {
	currentWatcher = fs.watch(filename, function(event){
		fs.stat(filename, function(err,stat){
      console.log("stat!", stat.size);
			if(err) {
				console.log(err);
				return;
			}
			if(currentFilesize > stat.size) {
				currentFilesize = stat.size;
				return;
			}
      console.log("reading ", stat.size);
			var stream = fs.createReadStream(filename, { start: currentFilesize, end: stat.size});
			stream.addListener("error",function(err){
        console.log(err);
			});
			stream.addListener("data", function(filedata) {
        var lines = filedata.toString('utf-8').split("\n");
        lines.forEach(function(line) {
          if (line.startsWith('get:')) {
            var parts = line.split(' ');
            var obj = {
              time: parts[1],
              src_node_id: parts[2],
              dest_node_id: parts[3],
              line_no: parts[10],
              filename: parts[11]
            };
            var strobj = JSON.stringify(obj);
            console.log(strobj);
            broadcast(strobj);
          }
        });
				currentFilesize = stat.size;
			});
		});
	});
}

// var spawn = require('child_process').spawn;
// var tail = spawn('tail', ['-f', 'fileToTail']);
// tail.stdout.on("data", function (data) {
//   broadcast(data.toString("utf8"));
// });
var watchDir = process.argv[2] || ".";
console.log("watching directory: ", watchDir);


fs.readdirSync(watchDir).forEach(function(filename) {
  var filePath = path.join(watchDir, filename);
  console.log("watching file: ", filePath);
  startWatching(filePath);
});
