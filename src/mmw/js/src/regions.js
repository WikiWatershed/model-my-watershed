"use strict";

var Backbone = require('../shim/backbone'),
    Marionette = require('../shim/backbone.marionette'),
    L = require('leaflet');

var MapRegion = Marionette.Region.extend({
    el: '#map',

    initialize: function() {
        var map = L.map('map').setView([40.1, -75.7], 10);
        L.tileLayer('http://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 18
        }).addTo(map);
        this.map = map;
    },

    load: function(data) {
        var state = data.map;
        if (state) {
            this.map.setView([state.lat, state.lng], state.zoom);
        }
    }
});

module.exports = {
    MapRegion: MapRegion
};
