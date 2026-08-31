"use strict";

var Backbone = require('../../shim/backbone'),
    $ = require('jquery'),
    _ = require('lodash'),
    turfArea = require('turf-area'),
    L = require('leaflet'),
    utils = require('./utils'),
    weatherStationLayer = require('./weatherStationLayer'),
    drawUtils = require('../draw/utils'),
    settings = require('./settings'),
    coreUnits = require('./units');

require('../../shim/Leaflet.MapboxVectorTile.umd');

var MapModel = Backbone.Model.extend({
    defaults: {
        lat: 0,
        lng: 0,
        zoom: 0,
        areaOfInterest: null,           // GeoJSON
        areaOfInterestName: '',
        wellKnownAreaOfInterest: null,  // "{layerCode}__{id}"
        areaOfInterestDrainageArea: false,
        geolocationEnabled: true,
        previousAreaOfInterest: null,
        dataCatalogVisible: false,
        dataCatalogResults: null,       // GeoJSON array
        dataCatalogActiveResult: null,  // Model
        dataCatalogDetailResult: null,  // Model
        selectedGeocoderArea: null,     // GeoJSON
        subbasinOpacity: 0.85,
        searchResult: null,             // [lat, lng]
    },

    revertMaskLayer: function() {
        // If a mask layer is applied, remove it in favor of a traditional
        // area of interest polygon
        this.set('maskLayerApplied', false);
    },

    restructureAoI: function() {
        // The structure of the AoI is slightly different depending
        // on whether the shape was drawn or selected. It needs to
        // be consistent because Project is always expecting an
        // object with type='MultiPolygon', a coordinates attribute
        // and nothing else.
        if (this.get('areaOfInterest')) {
            var aoi = utils.toMultiPolygon(this.get('areaOfInterest'));
            this.set('areaOfInterest', aoi);
        }
    },

    stashAOI: function() {
        // Since we oscillate between an area of interest and a blank map, stash
        // non-null AOI.
        if (!_.isNull(this.get('areaOfInterest'))) {
            this.set('previousAreaOfInterest', _.clone(this.get('areaOfInterest')));
        }
    },

    revertAOI: function() {
        this.set('areaOfInterest', _.clone(this.get('previousAreaOfInterest')));
    },

    setNoHeaderSidebarSize: function(fit, sidebarWidth) {
        this._setSizeOptions({
            fit: fit,
            hasSidebar: true,
            sidebarWidth: sidebarWidth,
        });
    },

    setDrawSize: function(fit) {
        this.setNoHeaderSidebarSize(fit);
    },

    setAnalyzeSize: function(fit) {
        this.setNoHeaderSidebarSize(fit);
    },

    setAnalyzeModelSize: function(fit) {
        this._setSizeOptions({
            fit: fit,
            hasProjectHeader: true,
            hasSidebar: true,
        });
    },

    setDataCatalogSize: function(fit) {
        this.setNoHeaderSidebarSize(fit);
    },

    setModelSize: function(fit) {
        this._setSizeOptions({
            fit: fit,
            hasToolbarHeader: true,
            hasSidebar: true,
        });
    },

    toggleSidebar: function() {
        var sizeCopy = _.clone(this.get('size')),
            updatedSize =_.merge(sizeCopy, {
                hasSidebar: !sizeCopy.hasSidebar
            });
        this.set('size', updatedSize);
    },

    toggleSecondarySidebar: function() {
        var sizeCopy = _.clone(this.get('size')),
            updatedSize =_.merge(sizeCopy, {
                hasSecondarySidebar: !sizeCopy.hasSecondarySidebar
            });
        this.set('size', updatedSize);
    },

// Set the sizing options for the map. `options` are...
//      fit                  - bool, true if should fit the map to the AoI
//      hasProjectHeader     - bool, true if the -projectheader class should
//                             be on the map container
//      hasToolbarHeader     - bool, true if the -toolbarheader class should
//                             be on the map container
//      hasSidebar           - bool, true if the -sidebar class should
//                             be on the map container
//      hasSecondarySidebar  - bool, true if the -double class
//                             should be on the map. Will on apply if `hasSidebar`

    _setSizeOptions: function(options) {
        this.set('size', options);
    }

});

var LayerModel = Backbone.Model.extend({
    defaults: {
        leafletLayer: null,
        layerType: null,
        display: null,
        shortDisplay: null,
        code: null,
        perimeter: null,
        maxZoom: null,
        minZoom: null,
        googleType: false,
        vectorType: false,
        disabled: false,
        hasOpacitySlider: false,
        hasTimeSlider: false,
        timeLayers: null,
        hasOverLayers: false,
        overLayers: null,
        legendMapping: null,
        cssClassPrefix: null,
        active: false,
        useColorRamp: false,
        colorRampId: null,
        legendUnitsLabel: null,
        legendUnitBreaks: null,
        bigCZ: null,
        bringToFront: false
    },

    buildLayer: function(layerSettings, layerType, initialActive) {
        var leafletLayer,
            timeLayers,
            overLayers,
            googleMaps = (window.google ? window.google.maps : null);

        // Check to see if the google api service has been loaded
        // before creating a google layer
        if (layerSettings.googleType){
            if (googleMaps) {
                leafletLayer = new L.Google(layerSettings.googleType, {
                    maxZoom: layerSettings.maxZoom
                });
            }
        } else if (layerSettings.vectorType) {
            leafletLayer = new L.TileLayer.MVTSource({
                url: layerSettings.url,
                maxZoom: layerSettings.maxZoom,
                maxNativeZoom: layerSettings.maxNativeZoom,
                minZoom: layerSettings.minZoom,
                style: function(feature) {
                    return {
                        color: '#1562A9',
                    };
                },
            });
        } else {
            var tileUrl = (layerSettings.url.match(/png/) === null ?
                            layerSettings.url + '.png' : layerSettings.url);
            _.defaults(layerSettings, {
                zIndex: utils.layerGroupZIndices[layerType],
                attribution: '',
                minZoom: 0});
            leafletLayer = new L.TileLayer(tileUrl, layerSettings);
        }

        if (layerSettings.time_slider_values) {
            // A tile layer which provides the url based on a current setting
            timeLayers = layerSettings.time_slider_values.map(function(period) {
                var monthUrl = tileUrl.replace(/{month}/, period);

                _.defaults(layerSettings, {
                    zIndex: utils.layerGroupZIndices[layerType],
                    attribution: '',
                    minZoom: 0});

                return new L.TileLayer(monthUrl, layerSettings);
            });

            leafletLayer = timeLayers[0];
        }

        if (layerSettings.overlay_codes) {
            overLayers = new L.LayerGroup(
                layerSettings.overlay_codes.map(function(code) {
                    var overlayUrl = tileUrl.replace(layerSettings.code, code),
                        overlaySettings = _.extend(layerSettings, {
                            code: code,
                            zIndex: utils.layerGroupZIndices[layerType],
                            attribution: '',
                            minZoom: 0 });

                    return new L.TileLayer(overlayUrl, overlaySettings);
                }));
        }

        this.set({
            leafletLayer: leafletLayer,
            layerType: layerType,
            display: layerSettings.display,
            shortDisplay: layerSettings.short_display,
            code: layerSettings.code,
            perimeter: layerSettings.perimeter,
            maxZoom: layerSettings.maxZoom,
            minZoom: layerSettings.minZoom,
            googleType: layerSettings.googleType,
            disabled: false,
            hasOpacitySlider: layerSettings.has_opacity_slider,
            hasTimeSlider: !!layerSettings.time_slider_values,
            timeLayers: timeLayers,
            hasOverLayers: !!layerSettings.overlay_codes,
            overLayers: overLayers,
            legendMapping: layerSettings.legend_mapping,
            cssClassPrefix: layerSettings.css_class_prefix,
            active: layerSettings.display === initialActive ? true : false,
            useColorRamp: layerSettings.use_color_ramp || false,
            colorRampId: layerSettings.color_ramp_id || null,
            legendUnitsLabel: layerSettings.legend_units_label || null,
            legendUnitBreaks: layerSettings.legend_unit_breaks || null,
            bigCZ: layerSettings.big_cz,
        });
    }
});

var WeatherStationLayerModel = LayerModel.extend({
    defaults: {
        bringToFront: true, // Ensures popups work when station is within project AOI.
        activeWeatherStations: null,
        activeWeatherStationPoints: null
    },

    // Sets active weather stations. Used to change the visual appearance
    // of any stations participating as modeling input, and to set the
    // distance of the weather station from an AOI into the popup.
    setActiveWeatherStations: function(weatherStations) {
        var leafletLayer = this.get('leafletLayer'),
            activeWeatherStations = {};

        if(this.activeWeatherStations) {
            this.clearActiveWeatherStations();
        }

        _.forEach(weatherStations, function(ws) {
            activeWeatherStations[ws.station] = ws;
        });


        this.set('activeWeatherStations', activeWeatherStations);

        if(leafletLayer) {
            var activeWeatherStationPoints =
                weatherStationLayer.Layer.setActiveWeatherStations(leafletLayer, activeWeatherStations);
            this.set('activeWeatherStationPoints', activeWeatherStationPoints);
        }
    },

    clearActiveWeatherStations: function() {
        var leafletLayer = this.get('leafletLayer'),
            prevActiveWeatherStations = this.get('activeWeatherStations');

        this.set('activeWeatherStations', null);
        this.set('activeWeatherStationPoints', null);

        if(leafletLayer && prevActiveWeatherStations) {
            weatherStationLayer.Layer.clearActiveWeatherStations(leafletLayer, prevActiveWeatherStations);
        }
    },

    // Toggles the layer. If toggling on, zoom the map to fit both
    // the AOI and the active weather stations.
    toggleAndZoom: function(areaOfInterest, map, layerGroup) {
        utils.toggleLayer(this, map, layerGroup);

        if(this.get('active')) {
            // We toggled on; zoom to the active weather stations.
            var activeStationPoints = this.get('activeWeatherStationPoints'),
                geoms = activeStationPoints ? activeStationPoints.slice(0) : [];

            if(geoms) {
                if(areaOfInterest) {
                    geoms.push(areaOfInterest);
                }
                var geomCollection = {
                    'type': 'GeometryCollection',
                    'geometries': geoms
                };

                var gjLayer = new L.GeoJSON(geomCollection);

                map.fitBounds(gjLayer.getBounds(), { reset: true });
            }
        }
    }
});

var LayersCollection = Backbone.Collection.extend({
    model: LayerModel,

    initialize: function(model, options) {
        var self = this;
        if (options) {
            _.forEach(settings.get(options.type), function(layer) {
                var layerModel = new LayerModel();
                layerModel.buildLayer(layer, options.type, options.initialActive);
                if (!settings.get('data_catalog_enabled') || layerModel.get('bigCZ')) {
                    self.add(layerModel);
                }
            });
        }
    },

    updateDisabled: function(layer, shouldDisable) {
        this.findWhere({ display: layer.display })
            .set('disabled', shouldDisable);
    },

    clearBgBufferOnLayer: function(layer) {
        var leafletLayer = this.findWhere({ display: layer.display})
            .get('leafletLayer');
        if (leafletLayer) {
            leafletLayer._clearBgBuffer();
        }
    },
});

var LayerGroupModel = Backbone.Model.extend({
    defaults: {
        name: null,
        layerType: null,
        layers: null,
        mustHaveActive: false,
        canSelectMultiple: false,
        selectedTimeLayerIdx: 0,
    },
});

var ObservationsLayerGroupModel = LayerGroupModel.extend({
    defaults: {
        name: 'Observations',
        layerType: 'observations',
        canSelectMultiple: true,
        polling: false,
        error: null,
        layers: null,
    },

    fetchLayers: function() {
        var self = this,
            weatherStationAPIUrl = '/mmw/modeling/weather-stations/';

        // LayerPickerGroupView's onShow fires on modelChange as of e93743eba77
        // where this function is called from. To prevent a series of recursive
        // calls, we change the model here silently to not trigger extra onShow.
        this.set('polling', true, { silent: true });

        return $.ajax({ 'url': weatherStationAPIUrl, 'type': 'GET'})
            .done(function(weatherStationData) {
                self.set({
                    'polling': false,
                    'error': null,
                });

                var observationLayersCollection = new LayersCollection();
                if (weatherStationData) {
                    try {
                        var leafletLayer = weatherStationLayer.Layer.createLayer(weatherStationData);
                        var numberOfPoints = weatherStationData.features.length;
                        observationLayersCollection.add(new WeatherStationLayerModel({
                            leafletLayer: leafletLayer,
                            display: 'Weather Stations (' + numberOfPoints + ')',
                            active: false,
                            code: 'weatherstations',
                            layerType: 'observations'}));
                    } catch(e) {
                        console.error('Unable to parse weather data');
                    }
                }

                self.set('layers', observationLayersCollection);
            })
            .fail(function() {
                self.set({
                    'polling': false,
                    'error': 'Could not load observations',
                });
            });
    },

    fetchLayersIfNeeded: function() {
        var notAlreadyFetching = !this.fetchLayersPromise,
            thereIsAnError = this.get('error');

        if (notAlreadyFetching || thereIsAnError) {
            this.fetchLayersPromise = this.fetchLayers();
        }

        return this.fetchLayersPromise;
    },

    // Returns a promise that resolves to the weather station layer, if available.
    getWeatherStationLayer: function() {
        var self = this;

        return self
            .fetchLayersIfNeeded()
            .then(function() {
                var layers = self.get('layers');
                if (layers) {
                    return layers.findWhere({ code: 'weatherstations' });
                }
                return null;
            });
    },

    // Method for setting the active stations on the model and
    // GeoJSON layer. If the ObservationTab is not yet fetched,
    // this fetches those layers in order to access the weather stations
    // layer model.
    //
    // The argument is a list if objects with a 'station' and 'distance' property,
    // where the distance is the distance in meters to the project AOI.
    setActiveWeatherStations: function(activeWeatherStations) {
        this.getWeatherStationLayer()
            .done(function(layer) {
                if(layer) {
                    layer.setActiveWeatherStations(activeWeatherStations);
                }
            });
    },

    // If the weather stations layer is fetched, clear out any
    // weather stations that are marked active.
    clearActiveWeatherStations: function() {
        var layers = this.get('layers');
        if (layers) {
            var layer = layers.findWhere({ code: 'weatherstations' });
            if(layer) {
                layer.clearActiveWeatherStations();
            }
        }
    }
});

var LayerTabModel = Backbone.Model.extend({
    defaults: {
        name: '',
        iconClass: '',
        layerGroups: null,
    },

    findLayerWhere: function(attributes) {
        var layerContext = { layer: null };
        this.get('layerGroups').find(function(layerGroup) {
            var layers = layerGroup.get('layers');
            if (layers) {
                this.layer = layers.findWhere(attributes);
                return this.layer;
            }
        }, layerContext);
        return layerContext.layer;
    },
});

var LayerTabCollection = Backbone.Collection.extend({
    model: LayerTabModel,

    initialize: function() {
        var defaultBaseLayer = _.find(settings.get('base_layers'), function(layer) {
                return layer.default === true;
            }),
            defaultBaseLayerName = defaultBaseLayer ? defaultBaseLayer['display'] : 'Streets';


        this.set([
            new LayerTabModel({
                name: 'Streams',
                    iconClass: 'icon-streams',
                    layerGroups: new Backbone.Collection([
                        new LayerGroupModel({
                            name: 'Streams',
                            layerType: 'stream_layers',
                            layers: new LayersCollection(null, {
                                type: 'stream_layers'
                            }),
                        }),
                    ]),
            }),
            new LayerTabModel({
                name: 'Coverage Grid',
                iconClass: 'icon-coverage',
                layerGroups: new Backbone.Collection([
                    new LayerGroupModel({
                        name: 'Coverage Grid',
                        layerType: 'coverage_layers',
                        layers: new LayersCollection(null, {
                            type: 'coverage_layers'
                        }),
                    }),
                ])
            }),
            new LayerTabModel({
                name: 'Boundary',
                iconClass: 'icon-boundary',
                layerGroups: new Backbone.Collection([
                    new LayerGroupModel({
                        name: 'Boundary',
                        layerType: 'boundary_layers',
                        layers: new LayersCollection(null, {
                            type: 'boundary_layers'
                        }),
                    }),
                ])
            }),
            new LayerTabModel({
                name: 'Observations',
                iconClass: 'icon-observations',
                layerType: 'observations',
                layerGroups: new LayersCollection([
                    new ObservationsLayerGroupModel(),
                ])
            }),
            new LayerTabModel({
                name: 'Basemaps',
                iconClass: 'icon-basemaps',
                layerGroups: new Backbone.Collection([
                    new LayerGroupModel({
                        name: 'Basemaps',
                        layerType: 'base_layers',
                        mustHaveActive: true,
                        layers: new LayersCollection(null, {
                            type: 'base_layers',
                            initialActive: defaultBaseLayerName,
                        }),
                    }),
                ])
            }),
        ]);
    },

    disableLayersOnZoomAndPan: function(leafletMap) {
        this.forEach(function(layerTab) {
            layerTab.get('layerGroups').forEach(function(layerGroup) {
                var layers = layerGroup.get('layers');
                if (layers)  {
                    utils.zoomToggle(leafletMap, layers.toJSON(),
                        _.bind(layers.updateDisabled, layers),
                        _.bind(layers.clearBgBufferOnLayer, layers));
                    utils.perimeterToggle(leafletMap, layers.toJSON(),
                        _.bind(layers.updateDisabled, layers),
                        _.bind(layers.clearBgBufferOnLayer, layers));
                }
            });
        });
    },

    findLayerWhere: function(attributes) {
        var layerContext = { layer: null };
        this.find(function(layerTab) {
            this.layer = layerTab.findLayerWhere(attributes);
            return this.layer;
        }, layerContext);
        return layerContext.layer;
    },

    findLayerGroup: function(layerType) {
        var layerGroupContext = { layerGroup: null };
        this.find(function(layerTab) {
            this.layerGroup = layerTab.get('layerGroups').findWhere({ layerType: layerType });
            return this.layerGroup;
        }, layerGroupContext);
        return layerGroupContext.layerGroup;
    },

    getObservationLayerGroup: function() {
        return this.findWhere({ name: 'Observations' })
            .get('layerGroups').first();
    },

    getBaseLayerTab: function() {
        return this.findWhere({ name: 'Basemaps'});
    },

    getCurrentActiveBaseLayer: function() {
        return this.getBaseLayerTab().findLayerWhere({ 'active': true });
    },

    getCurrentActiveBaseLayerName: function() {
        return this.getCurrentActiveBaseLayer().get('display');
    }
});

var TaskModel = Backbone.Model.extend({
    defaults: {
        pollInterval: 1000,
        
        // As many seconds as the max configured limit in the back-end
        timeout: settings.get('celery_task_time_limit') * 1000,
    },

    // Log a debug mesasge if available, plain otherwise
    log: function(message) {
        var logger = console.debug || console.log;

        logger('[' + this.get('name') + '] ' + message);
    },

    url: function(taskName, queryParams) {
        var encodedQueryParams = queryParams ? '?' + $.param(queryParams) : '';
        if (this.get('job')) {
            return '/' + this.get('taskType') + '/jobs/' + this.get('job') + '/';
        } else {
            return '/' + this.get('taskType') + '/' + (taskName || this.get('taskName')) + '/' + encodedQueryParams;
        }
    },

    headers: function() {
        var token = this.get('token');
        if (token) {
            return { 'Authorization': 'Token ' + token };
        }
        return null;
    },

    // Cancels any currently running jobs. The promise returned
    // by previous calls to pollForResults will be rejected.
    reset: function() {
        this.set({
            'job': null,
            'result': null,
            'status': null
        });
    },

    // taskHelper should be an object containing an optional object,
    // postData, an optional function, onStart, and functions pollSuccess,
    // pollFailure, and startFailure.
    start: function(taskHelper) {
        taskHelper = _.defaults(taskHelper, {
            onStart: _.noop,
            pollSuccess: _.noop,
            pollFailure: _.noop,
            pollEnd: _.noop,
            startFailure: _.noop
        });

        this.reset();
        if (taskHelper.onStart) {
            taskHelper.onStart();
        }
        var self = this,
            startDefer = self.fetch({
                url: self.url(taskHelper.taskName, taskHelper.queryParams),
                method: 'POST',
                data: taskHelper.postData,
                contentType: taskHelper.contentType,
                headers: self.headers()
            }),
            pollingDefer = $.Deferred();

            startDefer.done(function() {
                self.pollForResults(pollingDefer)
                    .done(taskHelper.pollSuccess)
                    .fail(function(error) {
                        if (error && error.cancelledJob) {
                            self.log('Job ' + error.cancelledJob + ' was cancelled.');
                        } else {
                            taskHelper.pollFailure(error);
                        }
                    })
                    .always(taskHelper.pollEnd);
            })
            .fail(taskHelper.startFailure);

        return {
            startPromise: startDefer.promise(),
            pollingPromise: pollingDefer.promise()
        };
    },

    pollForResults: function(defer) {
        // startJob is the value of this.get('job')
        // associated with a single call to start(). If start()
        // is called again, the values of this.get('job') and
        // startJob will diverge.
        var elapsed = 0,
            self = this,
            startJob = self.get('job');

        // Check the task endpoint to see if the job is
        // completed. If it is, return the results of
        // the job. If not, check again after
        // pollInterval has elapsed.
        var getResults = function() {
            if (elapsed >= self.get('timeout')) {
                defer.reject({timeout: true});
                return;
            }

            // If job was cancelled.
            if (startJob !== self.get('job')) {
                defer.reject({cancelledJob: startJob});
                return;
            }

            self.fetch({ headers: self.headers() })
                .done(function(response) {
                    self.log('Polling ' + self.url());
                    if (response.status === 'started') {
                        elapsed = elapsed + self.get('pollInterval');
                        window.setTimeout(getResults, self.get('pollInterval'));
                    } else if (response.status === 'complete') {
                        defer.resolve(response);
                    } else { // Captures 'failed' and anything else
                        defer.reject(response);
                    }
                })
                .fail(defer.reject);
        };

        window.setTimeout(getResults, self.get('pollInterval'));
        return defer.promise();
    }
});

var TaskMessageViewModel = Backbone.Model.extend({
    defaults: {
        currentStep: 0,
        numSteps: 1,
        hasError: false,
    },
    message: null,
    waitTimeMessage: null,
    iconClass: null,

    setError: function(message) {
        this.set('message', message);
        this.set('iconClasses', 'fa fa-exclamation-triangle');
        this.set('hasError', true);
    },

    setTimeoutError: function() {
        var message = 'Operation took too long <br />' +
                      'Consider trying a smaller area of interest.';

        this.set('message', message);
        this.set('iconClasses', 'fa fa-exclamation-triangle');
        this.set('hasError', true);
    },

    setWorking: function(message, step, waitTimeMessage) {
        this.set('message', message);
        this.set('waitTimeMessage', waitTimeMessage);
        this.set('currentStep', step);
        this.set('iconClasses', 'fa fa-circle-o-notch fa-spin');
        this.set('hasError', false);
    }
});

// A collection of data points, useful for tables.
var LandUseCensusCollection = Backbone.Collection.extend({
    comparator: 'nlcd'
});

var ProtectedLandsCensusCollection = Backbone.Collection.extend({
    comparator: 'class_id'
});

var GlobalLandUseCensusCollection = Backbone.Collection.extend({
    comparator: 'ioclass'
});

var SoilCensusCollection = Backbone.Collection.extend({
    comparator: 'code'
});

var AnimalCensusCollection = Backbone.Collection.extend({
    comparator: 'type'
});

var ClimateCensusCollection = Backbone.Collection.extend({
    comparator: 'monthidx'
});

var PointSourceCensusCollection = Backbone.PageableCollection.extend({
    comparator: 'city',
    mode: 'client',
    state: { pageSize: 6, firstPage: 1 }
});

var CatchmentWaterQualityCensusCollection = Backbone.PageableCollection.extend({
    comparator: 'nord',
    mode: 'client',
    state: { pageSize: 6, firstPage: 1 }
});

var StreamsCensusCollection = Backbone.Collection.extend({
    comparator: 'order',
});

var TerrainCensusCollection = Backbone.Collection.extend({
    comparator: 'name',
});

var DataCatalogPopoverResultCollection = Backbone.PageableCollection.extend({
    mode: 'client',
    state: { pageSize: 3, firstPage: 1, currentPage: 1 }
});

var GeoModel = Backbone.Model.extend({
    M_IN_KM: 1000000,

    defaults: {
        name: '',
        shape: null,        // GeoJSON
        area: '0',
        units: 'm²',
        isValidForAnalysis: true
    },

    initialize: function() {
        this.update();
        this.listenTo(this, 'change:shape', this.update);
    },

    update: function() {
        this.setDisplayArea();
        this.setValidForAnalysis();
    },

    setDisplayArea: function(shapeAttr, areaAttr, unitsAttr) {
        var shape = shapeAttr || 'shape',
            area = areaAttr || 'area',
            units = unitsAttr || 'units';

        if (!this.get(shape)) { return; }

        var areaInMeters = turfArea(this.get(shape));
        var unit = areaInMeters < this.M_IN_KM ? 'AREA_M' : 'AREA_XL';
        var value = coreUnits.get(unit, areaInMeters);

        this.set(area, value.value);
        this.set(units, value.unit);
    },

    setValidForAnalysis: function() {
        var shape = this.get('shape');
        this.set('isValidForAnalysis', drawUtils.isValidForAnalysis(shape));
    },

    getAreaInMeters: function() {
        var area = this.get('area');

        switch(this.get('units')) {
            case 'm²':
                return area;
            case 'km²':
                return area * coreUnits.METRIC.AREA_XL.factor;
            case 'mi²':
                return area * coreUnits.USCUSTOMARY.AREA_XL.factor;
            case 'ft²':
                return area * coreUnits.USCUSTOMARY.AREA_M.factor;
            default:
                throw "Unsupported unit type";
        }
    }
});

var AreaOfInterestModel = GeoModel.extend({
    defaults: _.extend({
        place: 'Selected Area',
        can_go_back: false
    }, GeoModel.prototype.defaults)
});

var AppStateModel = Backbone.Model.extend({
    defaults: {
        active_page: 'Select Area Of Interest',
    }
});

module.exports = {
    MapModel: MapModel,
    LayersCollection: LayersCollection,
    ObservationsLayerGroupModel: ObservationsLayerGroupModel,
    LayerTabCollection: LayerTabCollection,
    TaskModel: TaskModel,
    TaskMessageViewModel: TaskMessageViewModel,
    LandUseCensusCollection: LandUseCensusCollection,
    ProtectedLandsCensusCollection: ProtectedLandsCensusCollection,
    GlobalLandUseCensusCollection: GlobalLandUseCensusCollection,
    SoilCensusCollection: SoilCensusCollection,
    AnimalCensusCollection: AnimalCensusCollection,
    ClimateCensusCollection: ClimateCensusCollection,
    PointSourceCensusCollection: PointSourceCensusCollection,
    CatchmentWaterQualityCensusCollection: CatchmentWaterQualityCensusCollection,
    DataCatalogPopoverResultCollection: DataCatalogPopoverResultCollection,
    StreamsCensusCollection: StreamsCensusCollection,
    TerrainCensusCollection: TerrainCensusCollection,
    GeoModel: GeoModel,
    AreaOfInterestModel: AreaOfInterestModel,
    AppStateModel: AppStateModel
};
