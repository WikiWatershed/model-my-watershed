"use strict";

var Marionette = require('../shim/backbone.marionette'),
    views = require('./views'),
    models = require('./models');

var App = new Marionette.Application({
    initialize: function() {
        this.map = new models.MapModel();

        // This view is intentionally not attached to any region.
        this.mapView =  new views.MapView({
            model: this.map
        });

        this.rootView = new views.RootView();
    },

    load: function(data) {
        var mapState = data.map;
        if (mapState) {
            this.map.set({
                lat: mapState.lat,
                lng: mapState.lng,
                zoom: mapState.zoom
            });
        }
    },

    getLeafletMap: function() {
        return this.mapView._leafletMap;
    }
});

module.exports = App;
