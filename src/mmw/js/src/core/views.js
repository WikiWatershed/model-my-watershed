"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    _ = require('lodash'),
    router = require('../router.js').router,
    Marionette = require('../../shim/backbone.marionette'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    ZeroClipboard = require('zeroclipboard'),
    drawUtils = require('../draw/utils'),
    headerTmpl = require('./templates/header.html'),
    patterns = require('./patterns'),
    modalConfirmTmpl = require('./templates/confirmModal.html'),
    modalInputTmpl = require('./templates/inputModal.html'),
    modalShareTmpl = require('./templates/shareModal.html'),
    modificationPopupTmpl = require('./templates/modificationPopup.html'),
    areaOfInterestTmpl = require('../core/templates/areaOfInterestHeader.html'),

    BASIC_MODAL_CLASS = 'modal modal-basic fade';

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
        require('../app').getUserOrShowLogin();
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
        'change:halfSize': 'toggleMapSize',
        'change:maskLayerApplied': 'toggleMask'
    },

    // L.Map instance.
    _leafletMap: null,

    // Active "area of interest" shape on the map.
    // L.FeatureGroup instance.
    _areaOfInterestLayer: null,

    // Scenario modification shapes drawn on top of area of interest.
    // L.FeatureGroup instance.
    _modificationsLayer: null,

    initialize: function() {
        var map = new L.Map('map', { zoomControl: false }),
            // TODO: Replace tile layer, eventually.
            tileLayer = new L.TileLayer('https://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18
            }),
            areaOfInterestLayer = new L.FeatureGroup(),
            modificationsLayer = new L.FeatureGroup();

        map.addControl(new L.Control.Zoom({position: 'topright'}));
        map.setView([40.1, -75.7], 10);
        map.addLayer(tileLayer);
        map.addLayer(areaOfInterestLayer);
        map.addLayer(modificationsLayer);

        // Keep the map model up-to-date with the position of the map
        this.listenTo(map, 'moveend', this.updateMapModelPosition);
        this.listenTo(map, 'zoomend', this.updateMapModelZoom);

        this._leafletMap = map;
        this._areaOfInterestLayer = areaOfInterestLayer;
        this._modificationsLayer = modificationsLayer;
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

    toggleMask: function() {
        var aoi = this.model.get('areaOfInterest');
        if (!aoi) {
            return;
        }

        if (this.model.get('maskLayerApplied')) {
            this.updateAreaOfInterest();
        } else {
            this._areaOfInterestLayer.clearLayers();
            var layer = new L.GeoJSON(aoi);
            this._areaOfInterestLayer.addLayer(layer);
        }
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
                this.model.set('maskLayerApplied', true);
                this._leafletMap.fitBounds(layer.getBounds(), { reset: true });
            } catch (ex) {
                console.log('Error adding Leaflet layer (invalid GeoJSON object)');
            }
        }
    },

    // Add GeoJSON layer for each modification model in modificationsColl.
    // Pass null or empty argument to clear modification layers.
    updateModifications: function(modificationsColl) {
        var self = this,
            map = this._leafletMap;

        drawUtils.cancelDrawing(map);
        this._modificationsLayer.clearLayers();

        if (!modificationsColl) {
            return;
        }

        var layers = modificationsColl.reduce(function(acc, model) {
                try {
                    var style = patterns.getDrawOpts(model.get('value'));
                    return acc.concat(new L.GeoJSON(model.get('shape'), {
                            style: style,
                            onEachFeature: function(feature, layer) {
                                var popupContent = new ModificationPopupView({ model: model }).render().el;
                                layer.bindPopup(popupContent);
                            }
                    }));
                } catch (ex) {
                    console.log('Error creating Leaflet layer (invalid GeoJSON object)');
                }
            }, []);

        _.each(layers, function(layer) {
            self._modificationsLayer.addLayer(layer);
        });
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
            fillOpacity: 0.5,
            clickable: false
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

var ModificationPopupView = Marionette.ItemView.extend({
    template: modificationPopupTmpl,

    ui: {
        'delete': '.delete-modification'
    },

    events: {
        'click @ui.delete': 'deleteModification'
    },

    templateHelpers: function() {
        return {
            label: this.model.label(this.model.get('value'))
        };
    },

    deleteModification: function() {
        this.model.destroy();
        this.destroy();
    }
});

var BaseModal = Marionette.ItemView.extend({
    initialize: function() {
        var self = this;
        this.$el.on('hide.bs.modal', function() {
            self.destroy();
        });
    },

    onRender: function() {
        this.$el.modal('show');
    },

    hide: function() {
        this.$el.modal('hide');
    }
});

var ConfirmModal = BaseModal.extend({
    className: BASIC_MODAL_CLASS,

    ui: {
        confirmation: '.confirm'
    },

    events: {
        'click @ui.confirmation': 'triggerConfirmation'
    },

    template: modalConfirmTmpl,

    triggerConfirmation: function() {
        this.triggerMethod('confirmation');
    }
});

var InputModal = BaseModal.extend({
    className: BASIC_MODAL_CLASS,

    template: modalInputTmpl,

    ui: {
        save: '.save',
        input: 'input',
        error: '.error'
    },

    events: {
        'click @ui.save': 'updateFromInput'
    },

    updateFromInput: function() {
        var val = this.ui.input.val().trim();
        if (val) {
            this.triggerMethod('update', val);
            this.hide();
        } else {
            this.ui.error.text('Please enter a valid project name');
        }
    }
});

var ShareModal = BaseModal.extend({
    className: BASIC_MODAL_CLASS,

    template: modalShareTmpl,

    ui: {
        'signin': '.signin',
        'copy': '.copy',
        'input': 'input'
    },

    events: {
        'click @ui.signin': 'signIn'
    },

    // Override to initialize ZeroClipboard
    initialize: function() {
        BaseModal.prototype.initialize.call(this);
        this.zc = new ZeroClipboard();
    },

    // Override to attach ZeroClipboard to ui.copy button
    onRender: function() {
        var self = this;
        this.$el.on('shown.bs.modal', function() {
            self.zc.clip(self.$el.find(self.ui.copy.selector));
        });

        this.$el.modal('show');
    },

    signIn: function() {
        this.options.app.getUserOrShowLogin();
    }

});

var AreaOfInterestView = Marionette.ItemView.extend({
    template: areaOfInterestTmpl,
    initialize: function() {
        this.map = this.options.App.map;
        this.listenTo(this.map, 'change areaOfInterest', this.syncArea);
    },

    modelEvents: { 'change shape': 'render' },

    syncArea: function() {
        this.model.set('shape', this.map.get('areaOfInterest'));
    }
});


module.exports = {
    HeaderView: HeaderView,
    MapView: MapView,
    RootView: RootView,
    StaticView: StaticView,
    ConfirmModal: ConfirmModal,
    InputModal: InputModal,
    ShareModal: ShareModal,
    AreaOfInterestView: AreaOfInterestView,
    ModificationPopupView: ModificationPopupView
};
