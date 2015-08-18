"use strict";

var L = require('leaflet'),
    $ = require('jquery'),
    _ = require('underscore'),
    router = require('../router.js').router,
    Marionette = require('../../shim/backbone.marionette'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    drawUtils = require('../draw/utils'),
    modificationConfigUtils = require('../modeling/modificationConfigUtils'),
    headerTmpl = require('./templates/header.html'),
    modificationPopupTmpl = require('./templates/modificationPopup.html'),
    areaOfInterestTmpl = require('./templates/areaOfInterestHeader.html'),
    modalModels = require('./modals/models'),
    modalViews = require('./modals/views'),
    settings = require('./settings');

require('leaflet.locatecontrol');
require('leaflet-plugins/layer/tile/Google');

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
        logout: '.user-logout',
        cloneProject: '.clone-project'
    },

    events: {
        'click @ui.login': 'showLogin',
        'click @ui.logout': 'userLogout',
        'click @ui.cloneProject': 'cloneProject'
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
    },

    cloneProject: function() {
        event.preventDefault();

        var view = new modalViews.InputView({
            model: new modalModels.InputModel({
                title: 'Clone Project',
                fieldLabel: 'Project ID'
            })
        });

        view.on('update', function(projectId) {
            var cloneUrlFragment = '/project/' + projectId + '/clone',
                cloneUrl = window.location.origin + cloneUrlFragment,
                testUrl = '/api/modeling/projects/' + projectId;

            $.ajax(testUrl)
                .done(function() {
                    window.location.replace(cloneUrl);
                })
                .fail(function() {
                    window.alert(
                        'There was an error trying to clone that project. ' +
                        'Please ensure that the project ID is valid and ' +
                        'that you have permission to view the project.'
                    );
                });
        });
        view.render();
    }
});

// Init the locate plugin button and add it to the map.
function addLocateMeButton(map, maxZoom, maxAge) {
    var locateOptions = {
        position: 'topright',
        metric: false,
        drawCircle: false,
        showPopup: false,
        follow: false,
        markerClass: L.marker,
        markerStyle: {
            opacity: 0.0,
            clickable: false,
            keyboard: false
        },
        locateOptions: {
            maxZoom: maxZoom,
            // Cache location response, in ms
            maximumAge: maxAge
        },
        strings: {
            title: 'Zoom to your location.'
        }
    };

    L.control.locate(locateOptions).addTo(map);
}

// This view houses a Leaflet instance. The map container element must exist
// in the DOM before initializing.
var MapView = Marionette.ItemView.extend({
    modelEvents: {
        'change': 'updateView',
        'change:areaOfInterest': 'updateAreaOfInterest',
        'change:size': 'toggleMapSize',
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

    // Flag used to determine if AOI change should trigger a prompt.
    _areaOfInterestSet: false,
    _didRevert: false,

    initialize: function(options) {
        var defaultLayerName = _.findKey(settings.get('base_layers'), function(layerData) {
            return layerData.default;
        });

        _.defaults(options, {
            addZoomControl: true,
            addLocateMeButton: true,
            addLayerSelector: true,
            showLayerAttribution: true,
            initialLayerName: defaultLayerName,
            interactiveMode: true // True if clicking on map does stuff
        });

        var map = new L.Map(this.el, {
                zoomControl: false,
                attributionControl: options.showLayerAttribution
            }),
            areaOfInterestLayer = new L.FeatureGroup(),
            modificationsLayer = new L.FeatureGroup(),
            maxAge = 60000,
            timeout = 30000,
            self = this;

        this.interactiveMode = options.interactiveMode;

        if (!options.interactiveMode) {
            // Disable panning and zooming.
            // http://gis.stackexchange.com/questions/54454/disable-leaflet-interaction-temporary
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();

            if (map.tap) {
                map.tap.disable();
            }

            document.getElementById('map').style.cursor='default';
        }

        if (options.addZoomControl) {
            map.addControl(new L.Control.Zoom({position: 'topright'}));
        }

        if (options.addLocateMeButton) {
            addLocateMeButton(map, maxAge);
        }

        this.baseLayers = _.mapObject(settings.get('base_layers'), function(layerData) {
            if (layerData.type === 'google') {
                return new L.Google(layerData.googleType, {
                    maxZoom: layerData.maxZoom
                });
            } else {
                return new L.TileLayer(layerData.url, {
                    attribution: layerData.attribution || '',
                    maxZoom: layerData.maxZoom
                });
            }
        });

        if (options.addLayerSelector) {
            this.layerControl = L.control.layers(this.baseLayers, {}, {autoZIndex:false}).addTo(map);
        }

        var initialLayer = this.baseLayers[options.initialLayerName] ||
                           this.baseLayers[defaultLayerName];

        if (initialLayer) {
            map.addLayer(initialLayer);
        }

        map.addLayer(areaOfInterestLayer);
        map.addLayer(modificationsLayer);

        map.setView([40.1, -75.7], 10); // center the map

        // Keep the map model up-to-date with the position of the map
        this.listenTo(map, 'moveend', this.updateMapModelPosition);
        this.listenTo(map, 'zoomend', this.updateMapModelZoom);
        this.listenTo(this.model, 'change:areaOfInterest', this.aoiChangeWarning);

        // The max available zoom level changes based on the active base layer
        map.on('baselayerchange', this.updateCurrentZoomLevel);

        this._leafletMap = map;
        this._areaOfInterestLayer = areaOfInterestLayer;
        this._modificationsLayer = modificationsLayer;

        // Geolocation success handler
        function geolocation_success(position) {
            if (self.model.get('geolocationEnabled')) {
                var lng = position.coords.longitude,
                    lat = position.coords.latitude,
                    maxZoom = initialLayer.options.maxZoom || 18;

                map.setView([lat, lng], maxZoom);
            }
        }

        // Attempt to Geolocate.  If geolocation fails or is not
        // supported, nothing more needs to be done since the map has
        // already been centered.
        if (navigator.geolocation) {
            var geolocationOptions = {
                maximumAge : maxAge,
                timeout : timeout
            };

            // Wait a bit and then get the location. Suppresses issues on Safari
            // in which immediately requesting the location results in an
            // infinite request loop for geolocation permissions.
            setTimeout(function() {
                navigator.geolocation.getCurrentPosition(
                    geolocation_success,
                    _.noop,
                    geolocationOptions
                );
            }, 500);
        }
    },

    getActiveBaseLayerName: function() {
        var activeBaseLayerName,
            self = this;

        activeBaseLayerName = _.findKey(self.baseLayers, function(layer) {
            return self._leafletMap.hasLayer(layer);
        });

        return activeBaseLayerName;
    },

    onBeforeDestroy: function() {
        this._leafletMap.remove();
    },

    aoiChangeWarning: _.debounce(function() {
        var activityMode = settings.get('activityMode');

        // Fail fast.
        if (this._didRevert || !activityMode) {
            this._didRevert = false;
            return;
        }

        if (this._areaOfInterestSet) {
            var self = this,
                clearProject = new modalViews.ConfirmView({
                    model: new modalModels.ConfirmModel({
                        question: 'If you change the selected area you will lose your current work.',
                        confirmLabel: 'Make Changes',
                        cancelLabel: 'Cancel',
                        feedbackRequired: true
                    }),
                });

            clearProject.render();

            clearProject.on('confirmation', function() {
                self._didRevert = false;
                self._areaOfInterestSet = false;
                self.trigger('change:needs_reset', true);
            });

            clearProject.on('deny', function() {
                var map = self._leafletMap;
                self._didRevert = true;
                self.trigger('change:needs_reset', false);
                self.model.revertAOI();
                self.updateAreaOfInterest();
                drawUtils.cancelDrawing(map);
            });
        }

        this.model.stashAOI();
        this._areaOfInterestSet = true;
    }, 100, { leading: false, trailing: true }),

    // Call this so that the geolocation callback will not
    // reposition the map. Should be called after the map has been repositioned
    // by the user or from a saved model.
    disableGeolocation: function() {
        this.model.set('geolocationEnabled', false);
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
        this.disableGeolocation();
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
            var layer = new L.GeoJSON(aoi, {
                style: function() {
                    return drawUtils.polygonDefaults;
                }});
            this._areaOfInterestLayer.addLayer(layer);
        }
    },

    // Add a GeoJSON layer if `areaOfInterest` is set.
    updateAreaOfInterest: function() {
        this.disableGeolocation();
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
                    var style = modificationConfigUtils.getDrawOpts(model.get('value'));
                    return acc.concat(new L.GeoJSON(model.get('shape'), {
                            style: style,
                            onEachFeature: function(feature, layer) {
                                if (self.interactiveMode) {
                                    var popupContent = new ModificationPopupView({ model: model }).render().el;
                                    layer.bindPopup(popupContent);
                                }
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
        var size = this.model.get('size');

        if (size.half) {
            this.$el.addClass('half');
        } else {
            this.$el.removeClass('half');
        }

        this._leafletMap.invalidateSize();

        if (size.fit) {
            this.fitToAoi();
        }
    },

    fitToAoi: function() {
        var areaOfInterest = this.model.get('areaOfInterest');

        if (areaOfInterest) {
            var layer = new L.GeoJSON(areaOfInterest);
            this._leafletMap.fitBounds(layer.getBounds(), { reset: true });
        }
    },

    updateCurrentZoomLevel: function(e) {
        var layerMaxZoom = e.layer.options.maxZoom,
            map = this,
            currentZoom = map.getZoom();

        // Zoom the user out to the maximum zoom of the new layer
        // so that they don't see gray tiles.
        if (layerMaxZoom < currentZoom) {
            // TODO: There is no event we can consistently listen for
            // to know when we can call this successfully.
            // This is fixed in Leaflet 1.0 by using map.setMaxZoom
            window.setTimeout(function() {
                map.setZoom(layerMaxZoom);
            }, 100);
        }
    }
    }
});

// Apply a mask over the entire map excluding bounds/shape specified.
function applyMask(featureGroup, shapeLayer) {
    var worldBounds = L.latLngBounds([-90, -360], [90, 360]),
        outerRing = getLatLngs(worldBounds),
        innerRings = getLatLngs(shapeLayer),
        polygonOptions = {
            stroke: true,
            color: '#fff',
            weight: 3.5,
            opacity: 1,
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

    deleteModification: function() {
        this.model.destroy();
        this.destroy();
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
    AreaOfInterestView: AreaOfInterestView,
    ModificationPopupView: ModificationPopupView
};
