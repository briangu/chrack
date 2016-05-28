'use strict';
/* jshint esversion: 6 */

var http = require("http");
var ws = require("nodejs-websocket");
var fs = require("fs");
var path = require('path');

var currentWatcher = [];
var currentFilesize = [];
var eventData = {};
var maxCount = 0;
var localeCount = 0;

http.createServer(function (req, res) {
	fs.createReadStream("index.html").pipe(res)
}).listen(8080)

var server = ws.createServer(function (connection) {
	connection.on("text", function (str) {
		broadcastLatestEventData("word2vec_dsgd.chpl");
	})
	connection.on("close", function () {
		console.log("closing");
	})
})
server.listen(8081)

function broadcast(str) {
	server.connections.forEach(function (connection) {
		connection.sendText(str)
	})
}

function broadcastLatestEventData(filename) {
	var sourceFileContents = loadSourceFile(filename);
	var clientData =
		{
			maxCount: maxCount,
			eventData: eventData,
			sourceFile: {
				"word2vec_dsgd.chpl": sourceFileContents
			}
		};
	// console.log("clientData: ", clientData);
	broadcast(JSON.stringify(clientData));
}

function addEvent(eventObj) {
	console.log("addEvent: ", eventObj);
	if (eventData[eventObj.src_node_id] === undefined) eventData[eventObj.src_node_id] = {};
	if (eventData[eventObj.src_node_id][eventObj.dest_node_id] == undefined) eventData[eventObj.src_node_id][eventObj.dest_node_id] = { count: 0, events: [] };

	var intersection = eventData[eventObj.src_node_id][eventObj.dest_node_id];
	intersection.count += 1;
	intersection.events.push(eventObj);
	if (maxCount < intersection.count) {
		maxCount = intersection.count;
	}
}

// function startWatching(filename, localeId) {
// 	currentWatcher[localeId] = fs.watch(filename, function(event) {
// 		var watcherIndex = localeId;
// 		fs.stat(filename, function(err,stat){
// 			if(err) {
// 				console.log(err);
// 				return;
// 			}
// 			if(currentFilesize[watcherIndex] > stat.size) {
// 				currentFilesize[watcherIndex] = stat.size;
// 				return;
// 			}
//       // console.log("reading ", stat.size);
// 			var stream = fs.createReadStream(filename, { start: currentFilesize[watcherIndex], end: stat.size});
// 			stream.addListener("error",function(err){
//         console.log(err);
// 			});
// 			stream.addListener("data", function(filedata) {
// 				var addedCount = 0;
// 				var lines = filedata.toString('utf-8').split("\n");
// 				console.log("lines");
//         lines.forEach(function(line) {
// 					console.log(line);
//           if (line.startsWith('get:')) {
//             var parts = line.split(' ');
//             var obj = {
//               time: parts[1],
//               src_node_id: parts[2],
//               dest_node_id: parts[3],
//               line_no: parts[10],
//               filename: parts[11]
//             };
//            // allow filename to be empty
//            //  (typeof(obj.filename) === "string" && obj.filename.length > 0)
//             if (!isNaN(obj.time) &&
//                 !isNaN(obj.src_node_id) &&
//                 !isNaN(obj.dest_node_id) &&
//                 !isNaN(obj.line_no)) {
// 							addEvent(obj);
// 							addedCount += 1;
//             } else {
//               console.log("DROPPING: ", line);
//             }
//           }
//         });
//
// 				console.log(maxCount);
// 				console.log(eventData);
//
//         if (addedCount > 0) {
//           broadcast(JSON.stringify(eventData));
//         }
//
// 				currentFilesize[watcherIndex] = stat.size;
// 			});
// 		});
// 	});
// }

function loadSourceFile(filename) {
	return fs.readFileSync(filename, 'utf8')
}

function loadFile(filename) {
	console.log("loading file ", filename);
	var addedCount = 0;
	fs.readFileSync(filename, 'utf8').split("\n").forEach(function(line) {
		console.log(line);
		if (line.startsWith('get:')) {
			var parts = line.split(' ');
			var obj = {
				time: parts[1],
				src_node_id: parts[2],
				dest_node_id: parts[3],
				line_no: parts[10],
				filename: parts[11]
			};
		 // allow filename to be empty
		 //  (typeof(obj.filename) === "string" && obj.filename.length > 0)
			if (!isNaN(obj.time) &&
					!isNaN(obj.src_node_id) &&
					!isNaN(obj.dest_node_id) &&
					!isNaN(obj.line_no)) {
				addEvent(obj);
				addedCount += 1;
			} else {
				console.log("DROPPING: ", line);
			}
		}
	});
	console.log(addedCount);
	console.log(maxCount);
	console.log(eventData);
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
  // startWatching(filePath, localeCount);
	// localeCount += 1;
	loadFile(filePath);
});
console.log(maxCount);
console.log(eventData);
