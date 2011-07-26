/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/

var require; 
var define;

(function () {
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
	var paths = [];
	var aliases = {};
	
	var opts = Object.prototype.toString;
	
    function isFunction(it) { return opts.call(it) === "[object Function]"; };
    function isArray(it) { return opts.call(it) === "[object Array]"; };
    function isString(it) { return (typeof it == "string" || it instanceof String); };
    
	function _normalize(path) {
		var segments = path.split('/');
		var skip = 0;

		for (var i = segments.length; i >= 0; i--) {
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
		var isRelative = path.search(/^\.\/|^\.\.\//) === -1 ? false : true;
		if (isRelative) {
			var parentPath = paths.length > 0 ? paths[paths.length-1] : "";
			parentPath = parentPath.substring(0, parentPath.lastIndexOf('/')+1);
			path = parentPath + path;
			path = _normalize(path);
		}
		return path;
	};
	
	function _loadModule(id, cb, scriptText) {
		id = _expand(id);
		if (modules[id] !== undefined) {
			cb(modules[id].exports);
			return;
		}
		modules[id] = {};
		modules[id].id = id;
		if (cfg.forceLoad) {
			localStorage.removeItem(id);
		}
		var storedModule = localStorage[id];
		if (scriptText) {
			paths.push(id);
			_loadScript(scriptText);
			_loadModuleDependencies(id, function(exports){
				paths.pop();
                cb(exports);
            });
		} else if (storedModule === undefined || storedModule === null) {
			var url = id;
			if (aliases[url]) {
				url = aliases[url];
			}
	        if (url.charAt(0) !== '/') {
	        	url = cfg.baseUrl + url; 
	        	url += ".js";
	        }
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						localStorage[id] = xhr.responseText;
						paths.push(id);
						_loadScript(xhr.responseText);
						_loadModuleDependencies(id, function(exports){
							paths.pop();
			                cb(exports);
			            });
					} else {
						throw new Error("Unable to load ["+id+"]:"+xhr.status);
					}
				}
			};
			xhr.send(null);				
		} else {
			paths.push(id);
			_loadScript(storedModule);
			_loadModuleDependencies(id, function(exports){
				paths.pop();
                cb(exports);
            });
		}
	};
	
	function _loadModuleDependencies(id, cb) {
		var args = [];
		var m = modules[id];
		m.exports = {};
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
				} else if (dependency === 'require') {
					args.push(modules["require"].exports);
					iterate(itr);
				} else if (dependency === 'module') {
					args.push(m);
					iterate(itr);
				} else if (dependency === 'exports') {
					args.push(m.exports);
					iterate(itr);
				} else {
					_loadModule(dependency, function(module){
						args.push(module);
						iterate(itr);
					});
				}
			} else {
				if (m.factory !== undefined) {
					if (args.length < 1) {
						args.push(modules["require"].exports);
						args.push(m);
						args.push(m.exports);
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
			var req = require;
			req.toUrl = function(moduleResource) {
				return _expand(moduleResource);
			};
			req.defined = function(moduleName) {
				return _expand(moduleName) in modules;
			};
			req.specified = function(moduleName) {
				return _expand(moduleName) in modules;
			};
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
	
	function _loadScript(scriptSrc) {
		var script = document.createElement('script'); 
		script.type = "text/javascript"; 
		script.charset = "utf-8";
		var scriptContent = document.createTextNode(scriptSrc);
		script.appendChild(scriptContent);
		document.getElementsByTagName("head")[0].appendChild(script);
	};
	
	function _syncrequire(id) {
		id = _expand(id);
		return modules[id] === undefined ? undefined : modules[id].exports;
	};

	define = function (id, dependencies, factory) {
		if (!isString(id)) {
			factory = dependencies;
			dependencies = id;
			id = paths[paths.length-1];
		}
		if (!isArray(dependencies)) {
			factory = dependencies;
			dependencies = [];
		}
		if (isFunction(factory)) {
			modules[id].factory = factory;
		} else {
			modules[id].literal = factory;
		}
		modules[id].dependencies = dependencies; 
	};
	
    define.amd = {
        plugins: true
    };

	require = function (dependencies, callback) {
		if (isString(dependencies)) {
			return _syncrequire(dependencies);
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
	modules["require"].exports = require;
	var cfg = {baseUrl: "./"};

	lsjs = function(config, dependencies, callback) {
		if (!isArray(config) && typeof config == "object") {
			cfg = config;
			if (cfg.paths) {
				for (var p in cfg.paths) {
					var path = cfg.paths[p];
					aliases[p] = path;
				}
			}
			if (cfg.packages) {
				for (var i = 0; i < cfg.packages.length; i++) {
					var pkg = cfg.packages[i];
					var path = pkg.location + "/" + pkg.main;
					aliases[pkg.name] = path;
				}
			}
			cfg.baseUrl = cfg.baseUrl || "./";
		} else {	
			callback = dependencies;
			dependencies = config;
		}
		
		if (!isArray(dependencies)) {
			callback = dependencies;
			dependencies = [];
		}
		
		if (isFunction(callback)) {
			require(dependencies, callback);
		} else {
			require(dependencies);
		}
	};
	
	require.nameToUrl = function(moduleName, ext, relModuleMap) {
		return moduleName + ext;
    };
    
	var pageLoaded = false;
	var readyCallbacks = [];
    
	require.ready = function(callback) {
		if (pageLoaded) {
			callback();
		} else {
			readyCallbacks.push(callback);
		}
	};
    
	document.addEventListener("DOMContentLoaded", function() {
		pageLoaded = true;
		for (var i = 0; i < readyCallbacks.length; i++) {
			readyCallbacks[i]();
		}
	}, false);
	
}());
