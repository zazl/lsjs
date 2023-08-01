# lsjs

An AMD compliant loader that loads modules from localStorage. 

* Initially modules are loaded via XHR requests but are then subsequently loaded from the storage implementation, which by default is HTML5 localStorage. 
* A timestamp checking server component can be configured to ensure server-side module updates are transferred to the client.
* There is a WebSQL and a IndexedDB storage implementation plugin that can be used instead of HTML5 localStorage.

See https://github.com/zazl/lsjs/wiki and https://github.com/zazl/lsjs/wiki/Getting-Started for more information.
