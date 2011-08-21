/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/

var require;
var define;

(function () {
	/* These regexs are taken from requirejs */
    var commentRegExp = /(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg;
    var cjsRequireRegExp = /[^.]require\(["']([^'"\s]+)["']\)/g;
    
	Iterator = function(array) {
		this.array = array;
		this.current = 0;
	};

	Iterator.prototype = {
		hasMore: function() {
			return this.current < this.array.length;
		},
		next: function() {
			return this.array[this.current++];
		}
	};

	function supports_html5_storage() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	};
	
	if (!supports_html5_storage()) {
		throw new Error("local storage is unvailable");
	}
	
	var modules = {};
	var moduleStack = [];
	var paths = {};
	var pkgs = {};
	var reload = {};
	
	var opts = Object.prototype.toString;
	
    function isFunction(it) { return opts.call(it) === "[object Function]"; };
    function isArray(it) { return opts.call(it) === "[object Array]"; };
    function isString(it) { return (typeof it == "string" || it instanceof String); };
    
    function _getCurrentId() {
    	return moduleStack.length > 0 ? moduleStack[moduleStack.length-1].id : "";
    }
    
    function _getCurrentAlias() {
		var parentModule = moduleStack.length > 0 ? moduleStack[moduleStack.length-1] : undefined;
    	return parentModule ? parentModule.alias : undefined;
    }
    
	function _normalize(path) {
		var segments = path.split('/');
		var skip = 0;

		for (var i = (segments.length-1); i >= 0; i--) {
			var segment = segments[i];
			if (segment === '.') {
				segments.splice(i, 1);
			} else if (segment === '..') {
				segments.splice(i, 1);
				skip++;
			} else if (skip) {
				segments.splice(i, 1);
				skip--;
			}
		}
		return segments.join('/');
	};
	
	function _expand(path) {
		if (path == "." || path == "..") {
			path += "/";
		} 
		if (path.search(/^\.\/|^\.\.\//) !== -1 ) {
            if (path.match("/$")) {
                path = path.substring(0, path.length-1);
            }
    		var parentAlias = _getCurrentAlias();
			if (parentAlias) {
				path = parentAlias + "/../" + path;
			} else {
				path = _getCurrentId() + "/../" + path;
			}
			path = _normalize(path);
		}
		return path;
	};
	
	function _idToUrl(path, module) {
		var parentAlias = _getCurrentAlias();
		
		if (path === "." || path === "..") {
			path += "/";
		} 
		if (path.search(/^\.\/|^\.\.\//) !== -1) {
            if (path.match("/$")) {
                path = path.substring(0, path.length-1);
            }
			if (parentAlias) {
				path = parentAlias + "/../" + path;
			} else {
				path = _getCurrentId() + "/../" + path;
			}
		}
		
		path = _normalize(path);
		if (paths[path]) {
			return paths[path];
		}
		
		var aliasFound = false;
		segments = path.split("/");
		for (var i = segments.length; i >= 0; i--) {
			var pkg;
            var parent = segments.slice(0, i).join("/");
            if ((pkg = pkgs[parent])) {
            	aliasFound = true;
            	var pkgPath;
                if (path === pkg.name) {
                    pkgPath = pkg.location + '/' + pkg.main;
                } else {
                    pkgPath = pkg.location;
                }
    			segments.splice(0, i, pkgPath);
    			break;
            }
		}
		path = segments.join("/");
		if (aliasFound) {
			module.alias = path;
		}
		return path;
	};
	
	function _loadModule(id, cb, scriptText) {
		var expandedId = _expand(id);
		if (modules[expandedId] !== undefined) {
			var count = 0;
			function waitForLoad() {
				count += 100;
				if (count > 10000) {
					throw new Error("timeout while waiting for ["+id+"] to load");
				}
				if (modules[expandedId].exports === undefined) {
					setTimeout(function(){ waitForLoad(); }, 100);
				} else {
					cb(modules[id].exports);
				}
			};
			if (modules[expandedId].exports === undefined) {
				setTimeout(function(){ waitForLoad(); }, 100);
			} else {
				cb(modules[expandedId].exports);
			}
			return;
		}
		modules[expandedId] = {};
		modules[expandedId].id = expandedId;
		
		var url = _idToUrl(id, modules[expandedId]);
        if (url.charAt(0) !== '/') {
        	url = cfg.baseUrl + url; 
        }
    	url += ".js";
    	
    	var key = cfg.keyPrefix + url;
    	
		if (cfg.forceLoad || url in reload) {
			localStorage.removeItem(key);
		}
		
		if (localStorage[key] !== undefined && localStorage[key] !== null) {
			var storedModule = JSON.parse(localStorage[key]);
		}
		
		if (scriptText) {
			_inject(modules[expandedId], scriptText, cb);
		} else if (storedModule === undefined || storedModule === null) {
			_getModule(url, function(scriptSrc, ts){
				localStorage[key] = JSON.stringify({src: scriptSrc, timestamp: ts});
				_inject(modules[expandedId], scriptSrc, cb);
			});
		} else {
			_inject(modules[expandedId], storedModule.src, cb);
		}
	};
	
	function _inject(module, scriptSrc, cb) {
		moduleStack.push(module);
		if (cfg.injectViaScriptTag) {
			var script = document.createElement('script');
			script.type = "text/javascript";
			script.charset = "utf-8";
			var scriptContent = document.createTextNode(scriptSrc);
			script.appendChild(scriptContent);
			document.getElementsByTagName("head")[0].appendChild(script);
		} else {
	        eval(scriptSrc+"//@ sourceURL="+module.id);
		}
		_loadModuleDependencies(module.id, function(exports){
			moduleStack.pop();
            cb(exports);
        });
	};
	
	function _getModule(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url+"?nocache="+new Date().valueOf(), true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					cb(xhr.responseText, xhr.getResponseHeader("Last-Modified"));
				} else {
					throw new Error("Unable to load ["+url+"]:"+xhr.status);
				}
			}
		};
		xhr.send(null);				
	};
	
	function _loadModuleDependencies(id, cb) {
		var args = [];
		var m = modules[id];
		m.exports = {};
		var iterate = function(itr) {
			if (itr.hasMore()) {
				var dependency = itr.next();
				if (dependency.match(".+!.+")) {
					var add = true;
					if (dependency.match("^~#")) {
						dependency = dependency.substring(2);
						add = false;
					}
					var pluginName = dependency.substring(0, dependency.indexOf('!'));
					pluginName = _expand(pluginName);
					var pluginModuleName = dependency.substring(dependency.indexOf('!')+1);
					_loadPlugin(pluginName, pluginModuleName, function(pluginInstance) {
						if (add) {
							args.push(pluginInstance);
						}
						iterate(itr);
					});
				} else if (dependency === 'require') {
					args.push(_createRequire(_getCurrentId()));
					iterate(itr);
				} else if (dependency === 'module') {
					args.push(m);
					iterate(itr);
				} else if (dependency === 'exports') {
					args.push(m.exports);
					iterate(itr);
				} else {
					var add = true;
					if (dependency.match("^~#")) {
						dependency = dependency.substring(2);
						add = false;
					}
					_loadModule(dependency, function(module){
						if (add) {
							args.push(module);
						}
						iterate(itr);
					});
				}
			} else {
				if (m.factory !== undefined) {
					if (args.length < 1) {
						var req = _createRequire(_getCurrentId());
						args = args.concat(req, m.exports, m);
					}
					var ret = m.factory.apply(null, args);
					if (ret) {
						m.exports = ret;
					}
				} else {
					m.exports = m.literal;
				}
				cb(m.exports);
			}
		};
		iterate(new Iterator(m.dependencies));
	};
	
	function _loadPlugin(pluginName, pluginModuleName, cb) {
		_loadModule(pluginName, function(plugin){
			if (plugin.normalize) {
				pluginModuleName = plugin.normalize(pluginModuleName, _expand); 
			} else {
				pluginModuleName = _expand(pluginModuleName);
			}
			if (modules[pluginName+"!"+pluginModuleName] !== undefined) {
				cb(modules[pluginName+"!"+pluginModuleName].exports);
				return;
			}
			var req = _createRequire(pluginName);
			var load = function(pluginInstance){
		    	modules[pluginName+"!"+pluginModuleName] = {};
		    	modules[pluginName+"!"+pluginModuleName].exports = pluginInstance;
				cb(pluginInstance);
			};
			load.fromText = function(name, text) {
				_loadModule(name, function(){}, text);				
			};
			plugin.load(pluginModuleName, req, load, cfg);
		});
	};
	
	function _createRequire(id) {
		var req = function(dependencies, callback) {
			var root = modules[id];
			var savedStack = moduleStack;
			moduleStack = [root];
			if (isFunction(callback)) {
				_require(dependencies, function() {
					moduleStack = savedStack;
					callback.apply(null, arguments);
				});
			} else {
				var mod = _require(dependencies, callback);
				moduleStack = savedStack;
				return mod;
			}
		};
		req.toUrl = function(moduleResource) {
			return _expand(moduleResource);
		};
		req.defined = function(moduleName) {
			return _expand(moduleName) in modules;
		};
		req.specified = function(moduleName) {
			return _expand(moduleName) in modules;
		};
		req.ready = function(callback) {
			if (pageLoaded) {
				callback();
			} else {
				readyCallbacks.push(callback);
			}
		};
		req.nameToUrl = function(moduleName, ext, relModuleMap) {
			return moduleName + ext;
	    };
        // Dojo specific require properties and functions
        req.cache = {};
        req.toAbsMid = function(id) {
        	return _expand(id);
        };
        req.isXdUrl = function(url) {
        	return false;
        };
		return req;
	};
	
	function _getTimestamps(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, true);
		var currentTimestamps = [];
		for (var i=0; i < localStorage.length; i++) {
			var key = localStorage.key(i);
			if (key.match("^"+cfg.keyPrefix)) {
				try {
					var storedModule = JSON.parse(localStorage[key]);
					currentTimestamps.push({url: key.substring(cfg.keyPrefix.length), timestamp: storedModule.timestamp});
				} catch (e) {
					console.log("Failed to parse local storage value ["+localStorage[key]+"] : "+e);
				}
			}
		}
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					var urlsToReload = JSON.parse(xhr.responseText);
					for (var i = 0; i < urlsToReload.length; i++) {
						reload[urlsToReload[i]] = urlsToReload[i];
					}
					cb();
				} else {
					throw new Error("Unable to get timestamps via the url ["+url+"]:"+xhr.status);
				}
			}
		};
		xhr.send(JSON.stringify(currentTimestamps));				
	};

	define = function (id, dependencies, factory) {
		if (!isString(id)) {
			factory = dependencies;
			dependencies = id;
			id = _getCurrentId();
		}
		if (!isArray(dependencies)) {
			factory = dependencies;
			dependencies = [];
		}
		if (isFunction(factory)) {
			factory.toString().replace(commentRegExp, "").replace(cjsRequireRegExp, function (match, dep) {
				dependencies.push("~#"+dep);
            });
			modules[id].factory = factory;
		} else {
			modules[id].literal = factory;
		}
		modules[id].dependencies = dependencies; 
	};
	
    define.amd = {
        plugins: true
    };

	_require = function (dependencies, callback) {
		if (isString(dependencies)) {
			var id = dependencies;
			id = _expand(id);
			if (id.match(".+!.+")) {
				var pluginName = id.substring(0, id.indexOf('!'));
				pluginName = _expand(pluginName);
				var plugin = modules[pluginName].exports;
				var pluginModuleName = id.substring(id.indexOf('!')+1);
				if (plugin.normalize) {
					pluginModuleName = plugin.normalize(pluginModuleName, function(path){
						return _expand(path);
					});
				} else {
					pluginModuleName = _expand(pluginModuleName);
				}
				id = pluginName+"!"+pluginModuleName;
			}
			return modules[id] === undefined ? undefined : modules[id].exports;
		} else if (isArray(dependencies)) {
			var args = [];
			var iterate = function(itr) {
				if (itr.hasMore()) {
					var dependency = itr.next();
					if (dependency.match(".+!.+")) {
						var pluginName = dependency.substring(0, dependency.indexOf('!'));
						pluginName = _expand(pluginName);
						var pluginModuleName = dependency.substring(dependency.indexOf('!')+1);
						_loadPlugin(pluginName, pluginModuleName, function(pluginInstance) {
							args.push(pluginInstance);
							iterate(itr);
						});
					} else {
						_loadModule(dependency, function(module){
							args.push(module);
							iterate(itr);
						});
					}
				} else if (callback !== undefined) {
					callback.apply(null, args);
				}
			};
			iterate(new Iterator(dependencies));
			return undefined;
		}
	};
	
	modules["require"] = {};
	modules["require"].exports = _require;
	var cfg = {baseUrl: "./", keyPrefix: window.location.pathname};

	lsjs = function(config, dependencies, callback) {
		if (!isArray(config) && typeof config == "object") {
			cfg = config;
			if (cfg.paths) {
				for (var p in cfg.paths) {
					var path = cfg.paths[p];
					paths[p] = path;
				}
			}
			if (cfg.packages) {
				for (var i = 0; i < cfg.packages.length; i++) {
					var pkg = cfg.packages[i];
					pkgs[pkg.name] = pkg;
				}
			}
			cfg.baseUrl = cfg.baseUrl || "./";
			cfg.keyPrefix = cfg.keyPrefix || window.location.pathname;
		} else {	
			callback = dependencies;
			dependencies = config;
		}
		
		if (!isArray(dependencies)) {
			callback = dependencies;
			dependencies = [];
		}
		function callRequire(dependencies, callback) {
			if (isFunction(callback)) {
				_require(dependencies, callback);
			} else {
				_require(dependencies);
			}
		};
		if (cfg.timestampUrl) {
			_getTimestamps(cfg.timestampUrl, function(){
				callRequire(dependencies, callback);
			});
		} else {
			callRequire(dependencies, callback);
		}
	};
	
	var pageLoaded = false;
	var readyCallbacks = [];
    
	document.addEventListener("DOMContentLoaded", function() {
		pageLoaded = true;
		for (var i = 0; i < readyCallbacks.length; i++) {
			readyCallbacks[i]();
		}
	}, false);
	
	if (!require) {
		require = _require;
	}
}());
