#lsjs

An AMD compliant loader that loads modules from localStorage. 

* Initially modules are loaded via XHR requests but are then subsequently loaded from the storage implementation, which by default is HTML5 localStorage. 
* A timestamp checking server component can be configured to ensure server-side changes to modules are mimicked in the client.

See https://github.com/zazl/lsjs/wiki/Getting-Started for more information.