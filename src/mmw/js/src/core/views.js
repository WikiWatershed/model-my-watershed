"use strict";

var L = require('leaflet'),
    $ = require('jquery'),
    _ = require('underscore'),
    router = require('../router.js').router,
    Marionette = require('../../shim/backbone.marionette'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    drawUtils = require('../draw/utils'),
    coreUtils = require('./utils'),
    modificationConfigUtils = require('../modeling/modificationConfigUtils'),
    headerTmpl = require('./templates/header.html'),
    modificationPopupTmpl = require('./templates/modificationPopup.html'),
    areaOfInterestTmpl = require('./templates/areaOfInterestHeader.html'),
    modalModels = require('./modals/models'),
    modalViews = require('./modals/views'),
    settings = require('./settings'),
    LayerControl = require('./layerControl'),
    StreamSliderControl = require('./streamSliderControl'),
    OpacityControl = require('./opacityControl'),
    VizerLayers = require('./vizerLayers');


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

    initialize: function() {
        this.appState = this.options.appState;
        this.listenTo(this.appState, 'change', this.render);
    },

    templateHelpers: function() {
        var self = this;

        return {
            'itsi_embed': settings.get('itsi_embed'),
            'current_page_title': self.appState.get('current_page_title')
        };
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

    // Google Maps API library is loaded asynchronously via an inline script tag
    _googleMaps: (window.google ? window.google.maps : null),

    initialize: function(options) {
        var defaultLayer = _.findWhere(settings.get('base_layers'), function(layer) {
                return layer.default === true;
            }),
            defaultLayerName = defaultLayer ? defaultLayer['display'] : 'Streets',
            map_controls = settings.get('map_controls');

        _.defaults(options, {
            addZoomControl: _.contains(map_controls, 'ZoomControl'),
            addLocateMeButton: _.contains(map_controls, 'LocateMeButton'),
            addLayerSelector: _.contains(map_controls, 'LayerSelector'),
            addStreamControl: _.contains(map_controls, 'StreamControl'),
            showLayerAttribution: _.contains(map_controls, 'LayerAttribution'),
            initialLayerName: defaultLayerName,
            interactiveMode: true // True if clicking on map does stuff
        });

        var self = this,
            map = new L.Map(this.el, {
                zoomControl: false,
                attributionControl: options.showLayerAttribution
            }),
            overlayLayers = this.prepareOverlayLayers(),
            vizer = new VizerLayers(),
            layersReadyDeferred = vizer.getLayers();

        // Center the map on the U.S.
        map.fitBounds([
            [24.2, -126.4],
            [49.8, -66.0]
        ]);

        this._leafletMap = map;
        this._areaOfInterestLayer = new L.FeatureGroup();
        this._modificationsLayer = new L.FeatureGroup();
        this.baseLayers = this.buildLayers(settings.get('base_layers'));
        this.overlayLayers = this.buildLayers(overlayLayers, map);

        if (!options.interactiveMode) {
            this.setMapToNonInteractive();
        }

        if (options.addZoomControl) {
            map.addControl(new L.Control.Zoom({position: 'topright'}));
        }

        var maxGeolocationAge = 60000;
        if (options.addLocateMeButton) {
            addLocateMeButton(map, maxGeolocationAge);
        }

        layersReadyDeferred.then(function(vizerLayers) {
            if (options.addLayerSelector) {
                self.layerControl = new LayerControl(self.baseLayers, self.overlayLayers, vizerLayers, {
                    autoZIndex: false,
                    position: 'topright',
                    collapsed: false
                }).addTo(map);
            }
        });

        if (options.addStreamControl) {
            this.layerControl = new StreamSliderControl({
                autoZIndex: false,
                position: 'topright',
                collapsed: false
            }).addTo(map);
        }

        this.setMapEvents();
        this.setupGeoLocation(maxGeolocationAge);

        var initialLayer = this.baseLayers[options.initialLayerName] ||
                           this.baseLayers[defaultLayerName];

        if (initialLayer) {
            map.addLayer(initialLayer);
        }

        map.addLayer(this._areaOfInterestLayer);
        map.addLayer(this._modificationsLayer);
    },

    prepareOverlayLayers: function() {
        var nullVectorLayer = {
                display: 'nullVector',
                vector: true,
                empty: true
            },
            nullRasterLayer = {
                display: 'nullRaster',
                raster: true,
                empty: true
            },
            vectorOverlayLayers = settings.get('vector_layers'),
            rasterOverlayLayers = settings.get('raster_layers');

        vectorOverlayLayers = !_.isEmpty(vectorOverlayLayers) ?
                                [nullVectorLayer].concat(vectorOverlayLayers) : [];

        rasterOverlayLayers = !_.isEmpty(rasterOverlayLayers) ?
                                [nullRasterLayer].concat(rasterOverlayLayers) : [];

        return vectorOverlayLayers.concat(rasterOverlayLayers);
    },

    setupGeoLocation: function(maxAge) {
        var self = this,
            timeout = 30000;

        // Geolocation success handler
        function geolocation_success(position) {
            if (self.model.get('geolocationEnabled')) {
                var lng = position.coords.longitude,
                    lat = position.coords.latitude,
                    zoom = 12; // Regional zoom level

                self._leafletMap.setView([lat, lng], zoom);
            }
        }

        // Attempt to Geolocate. If geolocation fails or is not
        // supported, nothing more needs to be done since the map has
        // already been centered.
        if (navigator.geolocation) {
            var geolocationOptions = {
                maximumAge: maxAge,
                timeout: timeout
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

    setMapToNonInteractive: function() {
        // Disable panning and zooming.
        // Source: http://gis.stackexchange.com/questions/54454
        this._leafletMap.dragging.disable();
        this._leafletMap.touchZoom.disable();
        this._leafletMap.doubleClickZoom.disable();
        this._leafletMap.scrollWheelZoom.disable();
        this._leafletMap.boxZoom.disable();
        this._leafletMap.keyboard.disable();

        if (this._leafletMap.tap) {
            this._leafletMap.tap.disable();
        }

        this.el.style.cursor = 'default';
    },

    setMapEvents: function() {
        // Keep the map model up-to-date with the position of the map
        this.listenTo(this._leafletMap, 'moveend', this.updateMapModelPosition);
        this.listenTo(this._leafletMap, 'zoomend', this.updateMapModelZoom);
        this.listenTo(this.model, 'change:areaOfInterest', this.aoiChangeWarning);

        // The max available zoom level changes based on the active base layer
        this._leafletMap.on('baselayerchange', this.updateCurrentZoomLevel);

        // Some Google layers have a dynamic max zoom that we need to handle.
        // Check that Google Maps API library is available before implementing
        // this special handling.
        if (this._googleMaps) {
            this._googleMaxZoomService = new this._googleMaps.MaxZoomService();

            // TODO: Because the max zoom level is only read when a layer is selected
            // in the basemap control, updates to the maximum zoom level won't
            // be used until a user reselects a google base map. This can
            // be better implemented in Leaflet 1.0 which has map.setMaxZoom
            this._leafletMap.on('moveend', _.bind(this.updateGoogleMaxZoom, this));

            // Get the maximum zoom level for the initial location
            this.updateGoogleMaxZoom({ target: this._leafletMap });
        }
    },

    buildLayers: function(layerConfig, map) {
        var self = this,
            layers = {};

        _.each(layerConfig, function(layer) {
            var leafletLayer;

            // Check to see if the google api service has been loaded
            // before creating a google layer
            if (self._googleMaps && layer.type === 'google') {
                leafletLayer = new L.Google(layer.googleType, {
                    maxZoom: layer.maxZoom
                });
            } else if (!layer.empty) {
                var tileUrl = (layer.url.match(/png/) === null ?
                                layer.url + '.png' : layer.url),
                    zIndex = layer.overlay ? 1 : 0;

                _.defaults(layer, {
                    zIndex: zIndex,
                    attribution: '',
                    minZoom: 0});
                leafletLayer = new L.TileLayer(tileUrl, layer);
                if (layer.has_opacity_slider) {
                    var slider = new OpacityControl();

                    slider.setOpacityLayer(leafletLayer);
                    leafletLayer.slider = slider;
                }
            } else {
                leafletLayer = new L.TileLayer('', layer);
            }

            layers[layer['display']] = leafletLayer;
        });

        function actOnUI(datum, bool) {
            var code = datum.code,
                $el = $('#overlays-layer-list #' + code);
            $el.attr('disabled', bool);
            if (bool) {
                $el.siblings('span').addClass('disabled');
            } else {
                $el.siblings('span').removeClass('disabled');
            }
        }

        function actOnLayer(datum) {
            var display = datum.display;
            if (display) {
                // Work-around to prevent after-image when zooming
                // out.  Not worried about this when zooming in --
                // actually it is desirable in that case.  Derived
                // from https://github.com/Leaflet/Leaflet/issues/1905.
                layers[display]._clearBgBuffer();
            }
        }

        if (map) {
            // Toggle UI entries in response to zoom changes and make
            // sure that layers which are invisible due to their
            // minZoom being larger than the current zoom level are
            // cleared from the map.
            coreUtils.zoomToggle(map, layerConfig, actOnUI, actOnLayer);
        }

        return layers;
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
                                if (self.options.interactiveMode) {
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
        var self = this,
            size = this.model.get('size'),
            $container = this.$el.parent();

        $container.toggleClass('map-container-top-1', !!size.top.single);
        $container.toggleClass('map-container-top-2', !!size.top.double);

        $container.toggleClass('map-container-bottom-1', !!size.bottom.min);
        $container.toggleClass('map-container-bottom-2', !!size.bottom.small);
        $container.toggleClass('map-container-bottom-3', !!size.bottom.med);
        $container.toggleClass('map-container-bottom-4', !!size.bottom.large);

        $container.toggleClass('map-container-top-sidebar', !!size.top.sidebar);
        $container.toggleClass('map-container-bottom-sidebar', !!size.top.sidebar);


        _.delay(function() {
            self._leafletMap.invalidateSize();

            if (size.fit) {
                self.fitToAoi();
            }
        }, 300);
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
    },

    // The max zoom for a Google layer that uses satellite imagery
    // changes based on the location.
    updateGoogleMaxZoom: function(e) {
        var self = this,
            map = e.target,
            center = map.getCenter(),
            latLng = { lat: center.lat, lng: center.lng }; // Google LatLng literal

        this._googleMaxZoomService.getMaxZoomAtLatLng(latLng, function(response) {
            if (response.status !== self._googleMaps.MaxZoomStatus.OK) {
                // Leave the max layer zoom as is
                return;
            } else {
                // Set layer zoom level to the max for the current area
                _.each(self.baseLayers, function(layer) {
                    if (layer._type === 'HYBRID' || layer._type === 'SATELLITE') {
                        layer.options.maxZoom = response.zoom;
                    }
                });
            }
        });
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
