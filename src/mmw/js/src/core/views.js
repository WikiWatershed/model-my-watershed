"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    _ = require('lodash'),
    Marionette = require('../../shim/backbone.marionette'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    headerTmpl = require('./templates/header.ejs');

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
        drawToolsRegion: '#draw-tools-region',
        subHeaderRegion: '#sub-header',
        footerRegion: {
            regionClass: TransitionRegion,
            selector: '#footer'
        }
    }
});

var HeaderView = Marionette.ItemView.extend({
    template: headerTmpl,

    ui: {
        login: '.show-login'
    },

    events: {
        'click @ui.login': 'showLogin'
    },

    modelEvents: {
        'sync'  : 'render',
        'change': 'render'
    },

    showLogin: function() {
        // Defer requiring app until needed as it is not defined when
        // core.views are initialized (they are required in app.js)
        require('../app').showLoginModal();
    }

});

// This view houses a Leaflet instance. The map container element must exist
// in the DOM before initializing.
var MapView = Marionette.ItemView.extend({
    ui: {
        map: '#map'
    },

    modelEvents: {
        'change': 'updateView',
        'change:areaOfInterest': 'updateAreaOfInterest',
        'change:halfSize': 'toggleMapSize'
    },

    // Leaflet map instance.
    _leafletMap: null,

    // Active "area of interest" shape on the map; Feature Group object
    _areaOfInterestLayer: null,

    initialize: function() {
        var map = new L.Map('map', { zoomControl: false }),
            // TODO: Replace tile layer, eventually.
            tileLayer = new L.TileLayer('https://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18
            }),
            areaOfInterestLayer = new L.FeatureGroup();

        map.addControl(new L.Control.Zoom({position: 'topright'}));
        map.setView([40.1, -75.7], 10);
        map.addLayer(tileLayer);
        map.addLayer(areaOfInterestLayer);

        // Keep the map model up-to-date with the position of the map
        this.listenTo(map, 'moveend', this.updateMapModelPosition);
        this.listenTo(map, 'zoomend', this.updateMapModelZoom);

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

    // Update the map model position and zoom level
    // based on the current position and zoom level
    // of the map. Do it silently so that we don't
    // get stuck in an update -> set -> update loop.
    updateMapModelPosition: function() {
        var center = this._leafletMap.getCenter();

        this.model.set({
            lat: center.lat,
            lng: center.lng
        }, { silent: true });
    },

    updateMapModelZoom: function() {
        var zoom = this._leafletMap.getZoom();

        this.model.set({
            zoom: zoom
        }, { silent: true });
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
    },

    toggleMapSize: function() {
        if (this.model.get('halfSize')) {
            $(this.ui.map).addClass('half');
        } else {
            $(this.ui.map).removeClass('half');
        }

        this._leafletMap.invalidateSize();

        if (this.model.get('areaOfInterest')) {
            this._leafletMap.fitBounds(this._areaOfInterestLayer.getBounds());
        }
    }
});


module.exports = {
    HeaderView: HeaderView,
    MapView: MapView,
    RootView: RootView,
    StaticView: StaticView
};
