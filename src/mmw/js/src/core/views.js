"use strict";

var L = require('leaflet'),
    $ = require('jquery'),
    _ = require('underscore'),
    router = require('../router.js').router,
    Marionette = require('../../shim/backbone.marionette'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    coreUtils = require('./utils'),
    drawUtils = require('../draw/utils'),
    modificationConfigUtils = require('../modeling/modificationConfigUtils'),
    headerTmpl = require('./templates/header.html'),
    messageTmpl = require('./templates/message.html'),
    modificationPopupTmpl = require('./templates/modificationPopup.html'),
    modalModels = require('./modals/models'),
    modalViews = require('./modals/views'),
    settings = require('./settings'),
    SidebarToggleControl = require('./sidebarToggleControl');

require('leaflet.locatecontrol');
require('leaflet-plugins/layer/tile/Google');

var dataCatalogPolygonStyle = {
    stroke: true,
    color: 'steelblue',
    weight: 2,
    opacity: 1,
    fill: false
};

var dataCatalogPointStyle = _.assign({}, dataCatalogPolygonStyle, {
    fill: true,
    fillColor: 'steelblue',
    fillOpacity: 0.2
});

var dataCatalogActiveStyle = {
    stroke: true,
    color: 'gold',
    weight: 3,
    opacity: 1,
    fill: true,
    fillColor: 'gold',
    fillOpacity: 0.2,
    pointerEvents: 'none'
};

var dataCatalogDetailStyle = {
    stroke: true,
    color: 'steelblue',
    weight: 3,
    opacity: 1,
    fill: true,
    fillColor: 'steelblue',
    fillOpacity: 0.5
};

var selectedGeocoderAreaStyle = {
    stroke: true,
    fill: true,
    weight: 3,
    opacity: 0.5,
    fillOpacity: 0.2,
    fillColor: '#E77471',
    color: '#E77471'
};

var RootView = Marionette.LayoutView.extend({
    el: 'body',
    ui: {
        mapContainer: '.map-container',
        sidebar: '#sidebar'
    },
    regions: {
        mainRegion: '#container',
        geocodeSearchRegion: '#geocode-search-region',
        layerPickerRegion: '#layer-picker-region',
        layerPickerSliderRegion: '#layer-picker-slider-region',
        subHeaderRegion: '#sub-header',
        sidebarRegion: {
            regionClass: TransitionRegion,
            selector: '#sidebar-content'
        },
        compareRegion: '#compare',
        footerRegion: '#footer'
    },
    events: {
        'transitionend @ui.mapContainer': 'onMapResized'
    },

    onMapResized: function(e) {
        // Many `transitionend` events are fired, but you can filter
        // on the property name of the real event to find the correct
        // transition to follow
        if (e.originalEvent.propertyName !== 'right') {
            return;
        }
        this.options.app.getMapView().resetMapSize();
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
        return {
            'title': settings.get('title'),
            'itsi_embed': settings.get('itsi_embed'),
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
                testUrl = '/mmw/modeling/projects/' + projectId;

            $.ajax(testUrl)
                .done(function() {
                    window.location.replace(cloneUrl);
                })
                .fail(function() {
                    var alertView = new modalViews.AlertView({
                        model: new modalModels.AlertModel({
                            alertMessage:'There was an error trying to clone that project. ' +
                                    'Please ensure that the project ID is valid and ' +
                                    'that you have permission to view the project.',
                            alertType: modalModels.AlertTypes.error
                        })
                    });

                    alertView.render();
                });
        });
        view.render();
    }
});

// Init the locate plugin button and add it to the map.
function addLocateMeButton(map, maxZoom, maxAge) {
    var locateOptions = {
        position: 'bottomright',
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
        'change:maskLayerApplied': 'toggleMask',
        'change:dataCatalogResults': 'renderDataCatalogResults',
        'change:dataCatalogActiveResult': 'renderDataCatalogActiveResult',
        'change:dataCatalogDetailResult': 'renderDataCatalogDetailResult',
        'change:selectedGeocoderArea': 'renderSelectedGeocoderArea',
    },

    // L.Map instance.
    _leafletMap: null,

    // Active "area of interest" shape on the map.
    // L.FeatureGroup instance.
    _areaOfInterestLayer: null,

    // Scenario modification shapes drawn on top of area of interest.
    // L.FeatureGroup instance.
    _modificationsLayer: null,

    // Shapes for the active data catalog tab's results.
    // L.FeatureGroup instance
    _dataCatalogResultsLayer: null,
    _dataCatalogActiveLayer: null,
    _dataCatalogDetailLayer: null,

    // The shape for a selected geocoder boundary result
    // L.FeatureGroup instance
    _selectedGeocoderAreaLayer: null,

    // Flag used to determine if AOI change should trigger a prompt.
    _areaOfInterestSet: false,
    _didRevert: false,

    // Google Maps API library is loaded asynchronously via an inline script tag
    _googleMaps: (window.google ? window.google.maps : null),

    initialize: function(options) {
        var map_controls = settings.get('map_controls');

        this.layerTabCollection = options.layerTabCollection;

        _.defaults(options, {
            addZoomControl: _.contains(map_controls, 'ZoomControl'),
            addSidebarToggleControl: _.contains(map_controls, 'SidebarToggleControl'),
            addLocateMeButton: _.contains(map_controls, 'LocateMeButton'),
            showLayerAttribution: _.contains(map_controls, 'LayerAttribution'),
            interactiveMode: true // True if clicking on map does stuff
        });

        var map = new L.Map(this.el, {
                zoomControl: false,
                attributionControl: options.showLayerAttribution
            });

        this._leafletMap = map;
        this._areaOfInterestLayer = new L.FeatureGroup();
        this._modificationsLayer = new L.FeatureGroup();
        this._dataCatalogResultsLayer = new L.FeatureGroup();
        this._dataCatalogActiveLayer = new L.FeatureGroup();
        this._dataCatalogDetailLayer = new L.FeatureGroup();
        this._selectedGeocoderAreaLayer = new L.FeatureGroup();

        this.fitToDefaultBounds();

        if (!options.interactiveMode) {
            this.setMapToNonInteractive();
        }

        if (options.addZoomControl) {
            map.addControl(new L.Control.Zoom({position: 'bottomright'}));
            // We're overriding css to display the zoom controls horizontally.
            // Because the zoom-in div usally exists on top, we need to flip it
            // with the zoom-out div, so when they're horizontal they appear as
            // [ - | + ]
            $('.leaflet-control-zoom-out').insertBefore('.leaflet-control-zoom-in');
        }

        if (options.addLocateMeButton) {
            addLocateMeButton(map, coreUtils.MAX_GEOLOCATION_AGE);
        }

        if (options.addSidebarToggleControl) {
            map.addControl(new SidebarToggleControl({ model: options.model }));
        }

        this.setMapEvents();
        this.setupGeoLocation();

        var initialLayer = options.initialLayerName ?
            this.layerTabCollection.findLayerWhere({ display: options.initialLayerName }) :
            this.layerTabCollection.getBaseLayerTab().findLayerWhere({ active: true });

        if (initialLayer) {
            map.addLayer(initialLayer.get('leafletLayer'));
        }

        map.addLayer(this._areaOfInterestLayer);
        map.addLayer(this._modificationsLayer);
        map.addLayer(this._dataCatalogResultsLayer);
        map.addLayer(this._dataCatalogActiveLayer);
        map.addLayer(this._dataCatalogDetailLayer);
        map.addLayer(this._selectedGeocoderAreaLayer);
    },

    fitToDefaultBounds: function() {
        // Center the map on the U.S.
        this._leafletMap.fitBounds([
            [24.2, -126.4],
            [49.8, -66.0]
        ]);
    },

    /**
    Attempt to locate the user and set the map to it
    @param alwaysSetView -- override the map model setting `geolocationEnabled` (used to prevent
                            geolocating after the user has already updated the map),
                            and set the view to the geolocated area on success.
                            Use when you need to do a one-off geolocation
    **/
    setupGeoLocation: function(alwaysSetView) {
        var self = this,
            timeout = 30000,
            maxAge = coreUtils.MAX_GEOLOCATION_AGE;

        // Geolocation success handler
        function geolocation_success(position) {
            if (alwaysSetView || self.model.get('geolocationEnabled')) {
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
        this._leafletMap.on('baselayerchange', this.updateDrbLayerZoomLevel, this);

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

        if (settings.get('data_catalog_enabled')) {
            this._leafletMap.on('zoomend', this.renderDataCatalogDetailResult, this);
            this._leafletMap.on('moveend', this.renderDataCatalogDetailResult, this);
        }
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
            this.addAdditionalAoiShapes();
        }
    },

    // Add a GeoJSON layer if `areaOfInterest` is set.
    updateAreaOfInterest: function() {
        this.disableGeolocation();
        this.model.restructureAoI();
        var areaOfInterest = this.model.get('areaOfInterest');

        if (!areaOfInterest) {
            this._areaOfInterestLayer.clearLayers();
            this.model.set('areaOfInterestAdditionals', null);
        } else {
            try {
                var layer = new L.GeoJSON(areaOfInterest);
                applyMask(this._areaOfInterestLayer, layer);
                this.model.set('maskLayerApplied', true);
                this._leafletMap.fitBounds(layer.getBounds(), { reset: true });
                this.addAdditionalAoiShapes();
            } catch (ex) {
                console.log('Error adding Leaflet layer (invalid GeoJSON object)');
            }
        }
    },

    addAdditionalAoiShapes: function() {
        var self = this,
            additionalShapes = this.model.get('areaOfInterestAdditionals');

        if (additionalShapes) {
            _.each(additionalShapes.features, function(geoJSONpoint) {
                var newLayer = L.geoJson(geoJSONpoint, {
                    pointToLayer: function(feature, latLngForPoint) {
                        var customIcon = feature.properties.original ?
                            drawUtils.createRwdMarkerIcon('original-point') :
                            drawUtils.createRwdMarkerIcon('nearest-stream-point');
                        return L.marker(latLngForPoint, { icon: customIcon });
                    },
                    onEachFeature: function(feature, layer) {
                        var popupMessage = feature.properties.original ?
                            "Original clicked outlet point" :
                            "Outlet point snapped to nearest stream";
                        layer.bindPopup(popupMessage);
                    }
                });

                self._areaOfInterestLayer.addLayer(newLayer);
            });
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

        $container.toggleClass('-projectheader', !!size.hasProjectHeader);
        $container.toggleClass('-toolbarheader', !!size.hasToolbarHeader);
        $container.toggleClass('-sidebar', !!size.hasSidebar);
        $container.toggleClass('-wide', !!size.hasSidebar &&
            size.sidebarWidth === coreUtils.sidebarWide);

        _.delay(function() {
            self._leafletMap.invalidateSize();

            if (size.fit) {
                self.fitToAoi();
            }
        }, 300);
    },

    resetMapSize: function() {
        this._leafletMap.invalidateSize();
        this.fitToAoi();
    },

    fitToAoi: function() {
        var areaOfInterest = this.model.get('areaOfInterest');

        if (areaOfInterest) {
            var layer = new L.GeoJSON(areaOfInterest);
            this._leafletMap.fitBounds(layer.getBounds(), { reset: true });
        }
    },

    fitToModificationsOrAoi: function() {
        var modificationsBounds = this._modificationsLayer.getBounds();

        if (modificationsBounds.isValid()) {
            this._leafletMap.fitBounds(modificationsBounds, { reset: true });
        } else {
            this.fitToAoi();
        }
    },

    updateCurrentZoomLevel: function(layer) {
        var layerMaxZoom = layer.options.maxZoom,
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

    updateDrbLayerZoomLevel: function(layer) {
        var layerMaxZoom = layer.options.maxZoom;
        var drbStreamLayer = this.layerTabCollection.findLayerWhere({ code: 'drb_streams_v2' });
        drbStreamLayer.get('leafletLayer').options.maxZoom = layerMaxZoom;
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
                self.layerTabCollection.getBaseLayerTab().get('layerGroups').forEach(function(layerGroup) {
                    layerGroup.get('layers').forEach(function(layer) {
                        if (layer.get('googleType')) {
                            var leafletLayer = layer.get('leafletLayer');
                            if (leafletLayer) {
                                if (leafletLayer._type === 'HYBRID' || leafletLayer._type === 'SATELLITE') {
                                    leafletLayer.options.maxZoom = response.zoom;
                                }
                            }
                        }
                    });
                });
            }
        });
    },

    createDataCatalogShape: function(result) {
        var geom = result.get('geom'),
            geomId = geom && geom.properties.id,
            style = dataCatalogPolygonStyle,
            pointToLayer = null;

        if (geom.type === 'Point') {
            style = dataCatalogPointStyle;
            pointToLayer = function (feature, latlng) {
                return L.circleMarker(latlng);
            };
        }

        return new L.GeoJSON(geom, {
            style: style,
            id: geomId,
            pointToLayer: pointToLayer
        });
    },

    renderDataCatalogResults: function() {
        var results = this.model.get('dataCatalogResults') || [];

        this._dataCatalogResultsLayer.clearLayers();
        this._dataCatalogActiveLayer.clearLayers();

        results.forEach(function(result) {
            if (result.get('geom')) {
                var layer = this.createDataCatalogShape(result);
                this._dataCatalogResultsLayer.addLayer(layer);
            }
        }, this);
    },

    renderDataCatalogActiveResult: function() {
        var result = this.model.get('dataCatalogActiveResult');

        this._renderDataCatalogResult(result, this._dataCatalogActiveLayer,
            'bigcz-highlight-map', dataCatalogActiveStyle);
    },

    renderDataCatalogDetailResult: function() {
        var result = this.model.get('dataCatalogDetailResult');

        this._renderDataCatalogResult(result, this._dataCatalogDetailLayer,
            'bigcz-detail-map', dataCatalogDetailStyle);
    },

    _renderDataCatalogResult: function(result, featureGroup, className, style) {
        featureGroup.clearLayers();
        this.$el.removeClass(className);

        // If nothing is selected, exit early
        if (!result) { return; }

        var mapBounds = this._leafletMap.getBounds(),
            geom = result.get('geom');

        if (geom) {
            if ((geom.type === 'MultiPolygon' || geom.type === 'Polygon') &&
                drawUtils.shapeBoundingBox(geom).contains(mapBounds)) {
                this.$el.addClass(className);
            } else {
                var layer = this.createDataCatalogShape(result);
                layer.setStyle(style);
                featureGroup.addLayer(layer);
            }
        }
    },

    bindDataCatalogPopovers: function(PopoverView, catalogId, resultModels) {
        var self = this;
        this._dataCatalogResultsLayer.eachLayer(function(layer) {
            var result = resultModels.findWhere({ id: layer.options.id });
            layer.on('popupopen', function() {
                self.model.set('dataCatalogActiveResult', result.get('geom'));
            });
            layer.on('popupclose', function() {
                self.model.set('dataCatalogActiveResult', null);
            });
            layer.bindPopup(new PopoverView({
                    model: result,
                    catalog: catalogId
                }).render().el, { className: 'data-catalog-popover' });
        });
    },

    renderSelectedGeocoderArea: function() {
        var geom = this.model.get('selectedGeocoderArea');

        this._selectedGeocoderAreaLayer.clearLayers();

        if (geom) {
            this.disableGeolocation();

            var layer = new L.GeoJSON(geom, { style: selectedGeocoderAreaStyle });
            this._leafletMap.fitBounds(layer.getBounds(), { reset: true });
            this._selectedGeocoderAreaLayer.addLayer(layer);
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

var TaskMessageView = Marionette.ItemView.extend({
    template: messageTmpl,
    className: 'analyze-message-region'
});

module.exports = {
    HeaderView: HeaderView,
    MapView: MapView,
    RootView: RootView,
    TaskMessageView: TaskMessageView,
    ModificationPopupView: ModificationPopupView
};
