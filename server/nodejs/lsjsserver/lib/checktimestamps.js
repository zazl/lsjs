/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/
var url = require('url');
var path = require('path');
var fs = require('fs');

exports.handle = function(webroot, request, response) {
    requestURL = url.parse(request.url);
	if (requestURL.pathname.match("^/checktimestamps")) {
		if (request.method == 'POST') {
			var postData = "";
			request.on("data", function (data) {
				postData += data;
	        });
			request.on("end", function () {
				var timestamps = JSON.parse(postData);
				var modified = [];
				for (var i = 0; i < timestamps.length; i++) {
					var entry = timestamps[i];
					var stats = fs.statSync(path.normalize(webroot+entry.url));
					var d1 = new Date(entry.timestamp);
					var d2 = new Date(stats.mtime.getTime());
					if (d1.getTime() != d2.getTime()) {
						console.log("url ["+entry.url+"] timstamp is different ["+d1.getTime()+"] vs ["+d2.getTime()+"]");
						modified.push(entry.url);
					}
				}
				response.setHeader('Content-Type', 'application/json');
				response.write(JSON.stringify(modified));
				response.end();
			});
			return true;
		} else {
	    	response.writeHead(500, {'Content-Type': 'text/plain'});
	    	response.end("Error 500: Request for checktimestamps must provide POST data");
			return true;
		}
	} else {
		return false;
	}
};
