"use strict";

// Global jQuery needed for Bootstrap plugins.
var $ = require('jquery');
window.jQuery = window.$ = $;
require('bootstrap');
require('bootstrap-select');

var L = require('leaflet');
require('leaflet-draw');
// See: https://github.com/Leaflet/Leaflet/issues/766
L.Icon.Default.imagePath = '/static/images/';

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
    App = require('./app'),
    router = require('./router');

App.on('start', function() {
    $('body').on('click', '[data-url]', function(e) {
        e.preventDefault();
        router.navigate($(this).data('url'), { trigger: true });
    });
    Backbone.history.start({ pushState: true });
});

App.start();

loadData().then(function(data) {
    App.load(data);
});

window.MMW = App;
window.MMW.router = router;
