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

    // Ideally, this would be done in App.init,
    // but userViews requires App, so it's here
    // to avoid a circular requires.
    new userViews.LoginModalView({
        el: '#login',
        model: new userModels.LoginFormModel({})
    }).render();
});

App.start();

window.MMW = App;
window.MMW.router = router;
