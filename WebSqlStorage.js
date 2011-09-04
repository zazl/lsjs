/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/

var WebSqlStorage;

(function () {
	WebSqlStorage = function(dbSize) {
		this.db = openDatabase('lsjs db', '1.0', 'lsjs database', dbSize * 1024 * 1024);
		this.db.transaction(function(tx) {
		    tx.executeSql('CREATE TABLE IF NOT EXISTS lsjs(id TEXT PRIMARY KEY ASC, entry TEXT)');
		});
	};
	
	WebSqlStorage.prototype = {
		isSupported: function() {
			return !!window.openDatabase;
		},	
		remove: function(key, handler, errorHandler) {
			this.db.transaction(function(tx) {
			    tx.executeSql('DELETE FROM lsjs WHERE id=?', [key], function(tx){
					if (handler) {
						handler();
					}
			    }, function(tx, e){
					if (errorHandler) {
						errorHandler(e);
					} else {
						console.log("Failed to remove value in local storage ["+key+"] : "+e);
					}
			    });
			});
		},
		get: function(key, handler, errorHandler) {
			this.db.transaction(function(tx) {
			    tx.executeSql('SELECT entry FROM lsjs WHERE id=?', [key], function(tx, results){
			    	if (results.rows.length > 0) {
			    		var value = JSON.parse(results.rows.item(0).entry);
			    		handler(value);
			    	} else {
						if (errorHandler) {
							errorHandler("Failed to get value in local storage ["+key+"]");
						} else {
							console.log("Failed to get value in local storage ["+key+"] : "+e);
						}
			    	}
			    }, function(tx, e){
					if (errorHandler) {
						errorHandler(e);
					} else {
						console.log("Failed to get value in local storage ["+key+"] : "+e);
					}
			    });
			});
		},
		set: function(key, entry, handler, errorHandler) {
			var entryValue = JSON.stringify(entry);
			var scope = this;
			this.get(key, function(){
				scope.db.transaction(function(tx) {
				    tx.executeSql('UPDATE lsjs set entry=? where id=?', [entryValue, key], function(tx){
						if (handler) {
							handler(true);
						}
				    }, function(tx, e){
						if (errorHandler) {
							errorHandler(e);
						} else {
							console.log("Failed to set value in local storage ["+key+"] : "+e);
						}
				    });
				});
			}, function(){
				scope.db.transaction(function(tx) {
				    tx.executeSql('INSERT into lsjs (id, entry) VALUES (?, ?)', [key, entryValue], function(tx){
						if (handler) {
							handler(true);
						}
				    }, function(tx, e){
						if (errorHandler) {
							errorHandler(e);
						} else {
							console.log("Failed to set value in local storage ["+key+"] : "+e);
						}
				    	
				    });
				});
			});
		}
	};
}());
