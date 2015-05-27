"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    _ = require('lodash'),
    router = require('../router.js').router,
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
        login: '.show-login',
        logout: '.user-logout'
    },

    events: {
        'click @ui.login': 'showLogin',
        'click @ui.logout': 'userLogout'
    },

    modelEvents: {
        'sync'  : 'render',
        'change': 'render'
    },

    showLogin: function() {
        // Defer requiring app until needed as it is not defined when
        // core.views are initialized (they are required in app.js)
        require('../app').showLoginModal();
    },

    userLogout: function(event) {
        event.preventDefault();
        this.model.logout().done(function() {
            router.navigate('', {trigger: true});
        });
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
        this.model.restructureAoI();
        var areaOfInterest = this.model.get('areaOfInterest');
        if (!areaOfInterest) {
            this._areaOfInterestLayer.clearLayers();
        } else {
            try {
                var layer = new L.GeoJSON(areaOfInterest);
                applyMask(this._areaOfInterestLayer, layer);
                this._leafletMap.fitBounds(layer.getBounds(), { reset: true });
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

        var areaOfInterest = this.model.get('areaOfInterest');
        if (areaOfInterest) {
            var layer = new L.GeoJSON(areaOfInterest);
            this._leafletMap.fitBounds(layer.getBounds(), { reset: true });
        }
    }
});

// Apply a mask over the entire map excluding bounds/shape specified.
function applyMask(featureGroup, shapeLayer) {
    var worldBounds = L.latLngBounds([-90, -360], [90, 360]),
        outerRing = getLatLngs(worldBounds),
        innerRings = getLatLngs(shapeLayer),
        polygonOptions = {
            stroke: false,
            fill: true,
            fillColor: '#000',
            fillOpacity: 0.5
        },

        // Should be a 2D array of latlngs where the first array contains
        // the exterior ring, and the following arrays contain the holes.
        latlngs = _.reduce(innerRings, function(acc, hole) {
            return acc.concat(hole);
        }, [outerRing]),

        maskLayer = L.polygon(latlngs, polygonOptions);

    featureGroup.clearLayers();
    featureGroup.addLayer(maskLayer);
}

// Return 2D array of LatLng objects.
function getLatLngs(boundsOrShape) {
    var bounds = boundsOrShape instanceof L.LatLngBounds && boundsOrShape,
        featureGroup = boundsOrShape instanceof L.FeatureGroup && boundsOrShape;

    if (bounds) {
        // Return bounding box.
        return [
            bounds.getNorthWest(),
            bounds.getNorthEast(),
            bounds.getSouthEast(),
            bounds.getSouthWest()
        ];
    } else if (featureGroup) {
        // Return LatLng array, for each feature, for each layer.
        return _.map(featureGroup.getLayers(), function(layer) {
            var latlngs = layer.getLatLngs();
            if (layer instanceof L.Polygon) {
                return [latlngs];
            }
            // Assume layer is an instance of MultiPolygon.
            return latlngs;
        });
    }

    throw 'Unable to extract latlngs from boundsOrShape argument';
}

module.exports = {
    HeaderView: HeaderView,
    MapView: MapView,
    RootView: RootView,
    StaticView: StaticView
};
