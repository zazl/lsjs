#lsjs

An AMD compliant loader that loads modules from localStorage. 

* Initially modules are loaded via XHR requests but are then subsequently loaded from the storage implementation, which be default is HTML5 localStorage. * Use of an optional server component for timestamp checks allows for server-side modifications to modules to be propagated back to the client. 

See https://github.com/zazl/lsjs/wiki/Getting-Started for more information.