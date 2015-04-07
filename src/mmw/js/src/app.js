"use strict";

var Marionette = require('../shim/backbone.marionette'),
    views = require('./views');

var App = new Marionette.Application({
    load: function(data) {
        App.rootView.load(data);
    },

    // Return Leaflet map instance.
    getMap: function() {
        return App.rootView.mapRegion.map;
    }
});
App.rootView = new views.RootView();

module.exports = window.MMW = App;
