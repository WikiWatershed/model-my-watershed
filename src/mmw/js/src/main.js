"use strict";

// Global jQuery needed for Bootstrap plugins.
var $ = require('jquery');
window.jQuery = window.$ = $;
require('bootstrap');
require('bootstrap-select');

var L = require('leaflet');
// See: https://github.com/Leaflet/Leaflet/issues/766
L.Icon.Default.imagePath = '/static/images/';

require('./router');

// Fetch data from server based on current URL.
function loadData() {
    var defer = $.Deferred();
    // Simulate an ajax request on page load.
    // Should be replaced at a later point.
    setTimeout(function() {
        defer.resolve({
            map: {
                lat: 39.955929,
                lng: -75.157457,
                zoom: 12
            }
        });
    }, 1500);
    return defer.promise();
}

var Backbone = require('../shim/backbone'),
    App = require('./app');

App.on('start', function() {
    Backbone.history.start({ pushState: true });
});

App.start();
loadData().then(App.load);
