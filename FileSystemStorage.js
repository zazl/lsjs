/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

var FileSystemStorage;

(function () {
	var fileNameRegx = /(\/)/g;
	FileSystemStorage = function(size) {
		this.initialized = false;
		this.size = size;
	};
	
	FileSystemStorage.prototype = {
		_getFileName: function(key) {
			return key.replace(fileNameRegx, "_");
		},
		_getErrMsg: function(error) {
			var msg = '';

			  switch (error.code) {
			    case FileError.QUOTA_EXCEEDED_ERR:
			    	msg = 'QUOTA_EXCEEDED_ERR';
			    	break;
			    case FileError.NOT_FOUND_ERR:
			    	msg = 'NOT_FOUND_ERR';
			    	break;
			    case FileError.SECURITY_ERR:
			    	msg = 'SECURITY_ERR';
			    	break;
			    case FileError.INVALID_MODIFICATION_ERR:
			    	msg = 'INVALID_MODIFICATION_ERR';
			    	break;
			    case FileError.INVALID_STATE_ERR:
			    	msg = 'INVALID_STATE_ERR';
			    	break;
			    default:
			    	msg = 'Unknown Error';
					break;
			  };
			  return msg;
		},
		_defaultErrorHandler: function(error) {
			throw new Error(this._getErrMsg(error));
		},
		_initialize: function(cb) {
			var scope = this;
			if (!this.initialized) {
		  		window.requestFileSystem(window.TEMPORARY, scope.size * 1024 * 1024, function(fs) {
		  			scope.fs = fs;
		  			scope.fs.root.getDirectory('lsjs', {create: true}, function(dirEntry) {
		  				scope.dirEntry = dirEntry;
			  			cb();
						this.initialized = true;
		  			}, scope._defaultErrorHandler);
		  		}, scope._defaultErrorHandler);
			} else {
				cb();
			}
		},
		clear: function() {
			var scope = this;
			this._initialize(function() {
				scope.dirEntry.removeRecursively(function(){}, scope._defaultErrorHandler);
			});
		},
		isSupported: function() {
			return !!window.requestFileSystem;
		},	
		remove: function(key, handler, errorHandler) {
			var scope = this;
			this._initialize(function() {
				scope.dirEntry.getFile(
				scope._getFileName(key), 
				{create: false}, 
				function(fileEntry) {
				    fileEntry.remove(function() {
						if (handler) {
							handler(true);
						}
				    }, function(error) {
				    	var errMsg = scope._getErrMsg(error);
				    	if (errorHandler) {
				    		errorHandler(errMsg);
				    	} else {
				    		throw new Error(errMsg);
				    	}
				    });
				}, 
				function(error) {
			    	var errMsg = scope._getErrMsg(error);
			    	if (errorHandler) {
			    		errorHandler(errMsg);
			    	} else {
			    		throw new Error(errMsg);
			    	}
				});
			});
		},
		get: function(key, handler, errorHandler) {
			var scope = this;
			this._initialize(function() {
				scope.dirEntry.getFile(
				scope._getFileName(key), 
				{create: false}, 
				function(fileEntry) {
					fileEntry.file(function(file) {
						var reader = new FileReader();
						reader.onloadend = function(e) {
							handler(JSON.parse(this.result));
					    };
					    reader.readAsText(file);
					}, 
					function(error) {
				    	var errMsg = scope._getErrMsg(error);
				    	if (errorHandler) {
				    		errorHandler(errMsg);
				    	} else {
				    		throw new Error(errMsg);
				    	}
					});
				}, 
				function(error) {
			    	var errMsg = scope._getErrMsg(error);
			    	if (errorHandler) {
			    		errorHandler(errMsg);
			    	} else {
			    		throw new Error(errMsg);
			    	}
				});
			});
		},
		set: function(key, entry, handler, errorHandler) {
			var scope = this;
			this._initialize(function() {
				scope.dirEntry.getFile(
				scope._getFileName(key), 
				{create: true}, 
				function(fileEntry) {
					fileEntry.createWriter(function(fileWriter) {
						var bb = new WebKitBlobBuilder();
						bb.append(JSON.stringify(entry));
						fileWriter.write(bb.getBlob('text/plain'));
					}, function(error) {
				    	var errMsg = scope._getErrMsg(error);
				    	if (errorHandler) {
				    		errorHandler(errMsg);
				    	} else {
				    		throw new Error(errMsg);
				    	}
					});
				}, 
				function(error) {
			    	var errMsg = scope._getErrMsg(error);
			    	if (errorHandler) {
			    		errorHandler(errMsg);
			    	} else {
			    		throw new Error(errMsg);
			    	}
				});
			});
		}
	};
}());
