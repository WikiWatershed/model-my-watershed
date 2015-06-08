"use strict";

////
// Setup shims and require third party dependencies in the correct order.
// For example, jQuery needs to exist before requiring boostrap.
////

// Global jQuery needed for Bootstrap plugins.
var $ = require('jquery');
window.jQuery = window.$ = $;

require('bootstrap');
require('bootstrap-select');

var L = require('leaflet');
require('leaflet-draw');
require('../shim/leaflet.utfgrid');

// See: https://github.com/Leaflet/Leaflet/issues/766
L.Icon.Default.imagePath = '/static/images/';

var csrf = require('./csrf');
$.ajaxSetup(csrf.jqueryAjaxSetupOptions);

////
// Initialize application.
////

var Backbone = require('../shim/backbone'),
    App = require('./app'),
    router = require('./router').router,
    routes = require('./routes'),
    userViews = require('./user/views'),
    userModels = require('./user/models');

App.on('start', function() {
    $('body').on('click', '[data-url]', function(e) {
        e.preventDefault();
        router.navigate($(this).data('url'), { trigger: true });
    });
    Backbone.history.start({ pushState: true });

    // Show login modal only if landing on home page
    if (Backbone.history.getFragment() === "") {
        this.getUserOrShowLogin();
    } else {
        this.user.fetch();
    }
});

App.start();

////
// Expose application so we can interact with it via JS console.
////

window.MMW = App;
window.MMW.router = router;
