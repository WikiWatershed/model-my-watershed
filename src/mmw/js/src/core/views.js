"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette');

/**
 * A basic view for showing a static message.
 */
var StaticView = Marionette.ItemView.extend({
    initialize: function(options) {
        if (options.message) {
            this.message = options.message;
        }
    },
    template: function(model) {
        return model.message;
    },
    templateHelpers: function() {
        return { message: this.message };
    },
    message: ''
});

var RootView = Marionette.LayoutView.extend({
    el: 'body',
    regions: {
        mainRegion: '#container',
        geocodeSearchRegion: '#geocode-search-region',
        drawToolsRegion: '#draw-tools-region'
    }
});

// This view houses a Leaflet instance. The map container element must exist
// in the DOM before initializing.
var MapView = Marionette.ItemView.extend({
    modelEvents: {
        'change:lat change:lng change:zoom': 'updateView',
        'change:areaOfInterest': 'updateAreaOfInterest'
    },

    // Leaflet map instance.
    _leafletMap: null,

    // Active "area of interest" shape on the map; Feature Group object
    _areaOfInterestLayer: null,

    initialize: function() {
        var map = new L.Map('map'),
            // TODO: Replace tile layer, eventually.
            tileLayer = new L.TileLayer('https://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18
            }),
            areaOfInterestLayer = new L.FeatureGroup();

        map.setView([40.1, -75.7], 10);
        map.addLayer(tileLayer);
        map.addLayer(areaOfInterestLayer);

        this._leafletMap = map;
        this._areaOfInterestLayer = areaOfInterestLayer;
    },

    // Override the default render method because we manually update
    // the Leaflet map based on property changes on the map model.
    render: function() {
        // Noop
    },

    // Update map position and zoom level.
    updateView: function() {
        var lat = this.model.get('lat'),
            lng = this.model.get('lng'),
            zoom = this.model.get('zoom');
        if (lat && lng && zoom) {
            this._leafletMap.setView([lat, lng], zoom);
        }
    },

    // Add a GeoJSON layer if `areaOfInterest` is set.
    updateAreaOfInterest: function() {
        var areaOfInterest = this.model.get('areaOfInterest');
        if (!areaOfInterest) {
            this._areaOfInterestLayer.clearLayers();
        } else {
            try {
                var layer = new L.GeoJSON(areaOfInterest);
                this._areaOfInterestLayer.addLayer(layer);
                this._leafletMap.fitBounds(this._areaOfInterestLayer.getBounds());
            } catch (ex) {
                console.log('Error adding Leaflet layer (invalid GeoJSON object)');
            }
        }
    }
});


module.exports = {
    MapView: MapView,
    RootView: RootView,
    StaticView: StaticView
};
