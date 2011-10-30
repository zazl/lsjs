/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;

var IndexedDBStorage;

(function () {
	IndexedDBStorage = function() {
		this.initialized = 0;
		this.callbacks = [];
	};
	
	IndexedDBStorage.prototype = {
		_initialize: function(callback, errorHandler) {
			if (this.initialized === 2) {
				callback();
			} else if (this.initialized === 1) {
				this.callbacks.push({callack: callback, errorHandler: errorHandler});
			} else {
				this.initialized = 1;
				var request = window.indexedDB.open('lsjsdb');
				var scope = this;
				request.onsuccess = function(event) {
					var db = scope.db = event.target.result;
					if (db.version != '1.0') {
						var setVerRequest = db.setVersion('1.0');
						setVerRequest.onsuccess  = function(event) {
							var objectStore = db.createObjectStore('lsjs', { keyPath: "key" });
							scope.initialized = 2;
							for (var i = 0; i < scope.callbacks.length; i++) {
								scope.callbacks[i].callack();
							}
							callback();
							scope.callbacks = [];
						};
						setVerRequest.onerror  = function(event) {
							console.log("Unable to set the version on the IndexedDB database");
							scope.initialized = 2;
							for (var i = 0; i < scope.callbacks.length; i++) {
								scope.callbacks[i].errorHandler(event);
							}
							errorHandler(event);
							scope.callbacks = [];
						};
					} else {
						scope.initialized = 2;
						for (var i = 0; i < scope.callbacks.length; i++) {
							scope.callbacks[i].callack();
						}
						callback();
						scope.callbacks = [];
					}	
				};
				request.onerror = function(event) {
					console.log("Unable to open IndexedDB database");
					scope.initialized = 2;
					for (var i = 0; i < scope.callbacks.length; i++) {
						scope.callbacks[i].errorHandler(event);
					}
					errorHandler(event);
					scope.callbacks = [];
					callback(event);
				};
			}
		},
		clear: function() {
			var request = window.indexedDB.open('lsjsdb');
			request.onsuccess = function(event) {
				var db = event.target.result;
				var setVerRequest = db.setVersion('0.0');
				setVerRequest.onsuccess  = function(event) {
					try {
						db.deleteObjectStore('lsjs');
					} catch (e) {
						console.log("Failed to delete db : "+ e);
					}
	 			};
				setVerRequest.onerror  = function(event) {
					console.log("Unable to set the version on the IndexedDB database");
				};
			};
			request.onerror = function(event) {
				console.log("failed to open db :"+event);
			};
		},
		isSupported: function() {
			return !!window.indexedDB;
		},	
		remove: function(key, handler, errorHandler) {
			var scope = this;
			this._initialize(function() {
				var transaction = scope.db.transaction(["lsjs"], IDBTransaction.READ_WRITE);
				var store = transaction.objectStore("lsjs");
				var request = store.delete(key);
				request.onsuccess = function(event) {
					if (handler) {
						handler(true);
					}
				};
				request.onerror = function(event) {
					if (errorHandler) {
						errorHandler(event.value);
					} else {
						console.log("Failed to remove value in local storage ["+key+"] : "+event.value);
					}
				};			
			}, errorHandler);
		},
		get: function(key, handler, errorHandler) {
			var scope = this;
			this._initialize(function() {
				var transaction = scope.db.transaction(["lsjs"]);  
				var store = transaction.objectStore("lsjs");  
				var request = store.get(key);  
				request.onsuccess = function(event) {
					if (event.target.result && event.target.result.entry) {
						handler(request.result.entry);
					} else {
						errorHandler("Failed to get value in local storage ["+key+"]");
					}
				};
				request.onerror = function(event) {  
					errorHandler(event.value);
				};
			}, errorHandler);
		},
		set: function(key, entry, handler, errorHandler) {
			var scope = this;
			this._initialize(function() {
				var trans = scope.db.transaction(["lsjs"], IDBTransaction.READ_WRITE);
				var store = trans.objectStore("lsjs");
				var request = store.put({"key": key, "entry": entry});
				request.onsuccess = function(event) {
					if (handler) {
						handler(true);
					}
				};
				request.onerror = function(event) {
					if (errorHandler) {
						errorHandler(event.value);
					} else {
						console.log("Failed to set value in local storage ["+key+"] : "+e);
					}
				};			
			}, errorHandler);
		}
	};
}());
