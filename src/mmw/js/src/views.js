"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../shim/backbone.marionette');

var StaticView = Marionette.ItemView.extend({});

var RootView = Marionette.LayoutView.extend({
    el: 'body',
    regions: {
        mainRegion: '#container'
    }
});

// This view houses a Leaflet instance. The map container element must exist
// in the DOM before initializing.
var MapView = Marionette.ItemView.extend({
    modelEvents: {
        'change': 'render'
    },

    // Leaflet map instance.
    _leafletMap: null,

    initialize: function() {
        var map = L.map('map').setView([40.1, -75.7], 10);
        L.tileLayer('http://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 18
        }).addTo(map);
        this._leafletMap = map;
    },

    render: function() {
        var lat = this.model.get('lat'),
            lng = this.model.get('lng'),
            zoom = this.model.get('zoom');
        if (lat && lng && zoom) {
            this._leafletMap.setView([lat, lng], zoom);
        }
    }
});

module.exports = {
    MapView: MapView,
    RootView: RootView,
    StaticView: StaticView
};
