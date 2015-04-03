"use strict";

// Global jQuery needed for Bootstrap plugins.
window.jQuery = window.$ = require('jquery');
require('bootstrap');
require('bootstrap-select');

var L = require('leaflet');
// See: https://github.com/Leaflet/Leaflet/issues/766
L.Icon.Default.imagePath = '/static/images/';

require('./router');

var Backbone = require('../shim/backbone'),
    App = require('./app');

App.on('start', function() {
    Backbone.history.start({ pushState: true });
});

App.start();
