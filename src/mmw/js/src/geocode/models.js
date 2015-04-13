"use strict";

var Backbone = require('../../shim/backbone'),
    App = require('../app');


var GeocodeCandidate = Backbone.Model.extend({
    setMapViewToCandidate: function(zoom) {
        App.map.set({
            lat: this.get('y'),
            lng: this.get('x'),
            zoom: zoom
        });
    }
});

var GeocodeCandidates = Backbone.Collection.extend({
    url: '/api/geocode/',
    model: GeocodeCandidate
});

module.exports = {
    GeocodeCandidate: GeocodeCandidate,
    GeocodeCandidates: GeocodeCandidates
};
