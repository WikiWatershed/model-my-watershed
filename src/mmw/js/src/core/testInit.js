/*
Ensure that the tests have access to jQuery and boostrap, which can be
called from js modules without explicitly requiring it.  These contents
will end up mirroring main.js to some degree, but should be imported in
test modules.
*/

var $ = require('jquery');
window.jQuery = window.$ = $;
require('bootstrap');
