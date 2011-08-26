/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/
var http = require('http');
var nodestatic = require('node-static');
var fs = require('fs');
var checktimestamps = require('./checktimestamps');

var appdir = process.argv.length > 2 ? process.argv[2] : process.cwd();
appdir = fs.realpathSync(appdir);

var fileServer = new nodestatic.Server(appdir);

http.createServer(function (request, response) {
	if (!checktimestamps.handle(appdir, request, response)) {
		fileServer.serve(request, response);
	}
}).listen(8080);

console.log("lsjs server running");
