"use strict";

var Backbone = require('../../shim/backbone'),
    $ = require('jquery'),
    _ = require('lodash'),
    turfArea = require('turf-area'),
    L = require('leaflet'),
    utils = require('./utils'),
    pointSourceLayer = require('../core/pointSourceLayer'),
    drawUtils = require('../draw/utils'),
    settings = require('./settings'),
    VizerLayers = require('./vizerLayers');

var MapModel = Backbone.Model.extend({
    defaults: {
        lat: 0,
        lng: 0,
        zoom: 0,
        areaOfInterest: null,           // GeoJSON
        areaOfInterestName: '',
        halfSize: false,
        geolocationEnabled: true,
        previousAreaOfInterest: null
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

    setDoubleHeaderSmallFooterSize: function(fit) {
        this._setSizeOptions({ double: true  }, { small: true }, fit);
    },

    setDoubleHeaderHalfFooterSize: function(fit) {
        this._setSizeOptions({ sidebar: true  }, { sidebar: true }, fit);
    },

    setDoubleHeaderSidebarSize: function(fit) {
        this._setSizeOptions({ sidebar: true  }, { sidebar: true }, fit);
    },

    setNoHeaderSidebarSize: function(fit) {
        var noHeader = true;
        this._setSizeOptions({ sidebar: true  }, { sidebar: true }, fit, noHeader);
    },

    setDrawSize: function(fit) {
        this.setNoHeaderSidebarSize(fit);
    },

    setAnalyzeSize: function(fit) {
        this._setSizeOptions({ single: true  }, { large: true }, fit);
    },

    _setSizeOptions: function(top, bottom, fit, noHeader) {
        this.set('size', { top: top, bottom: bottom, fit: !!fit, noHeader: noHeader });
    }

});

var LayerModel = Backbone.Model.extend({
    defaults: {
        leafletLayer: null,
        layerType: null,
        display: null,
        code: null,
        perimeter: null,
        maxZoom: null,
        minZoom: null,
        googleType: false,
        disabled: false,
        hasOpacitySlider: false,
        legendMapping: null,
        cssClassPrefix: null,
        active: false,
    },

    buildLayer: function(layerSettings, layerType, initialActive) {
        var leafletLayer,
            googleMaps = (window.google ? window.google.maps : null);

        // Check to see if the google api service has been loaded
        // before creating a google layer
        if (layerSettings.googleType){
            if (googleMaps) {
                leafletLayer = new L.Google(layerSettings.googleType, {
                    maxZoom: layerSettings.maxZoom
                });
            }
        } else {
            var tileUrl = (layerSettings.url.match(/png/) === null ?
                            layerSettings.url + '.png' : layerSettings.url);
            _.defaults(layerSettings, {
                zIndex: utils.layerGroupZIndices[layerType],
                attribution: '',
                minZoom: 0});
            leafletLayer = new L.TileLayer(tileUrl, layerSettings);
        }

        this.set({
            leafletLayer: leafletLayer,
            layerType: layerType,
            display: layerSettings.display,
            code: layerSettings.code,
            perimeter: layerSettings.perimeter,
            maxZoom: layerSettings.maxZoom,
            minZoom: layerSettings.minZoom,
            googleType: layerSettings.googleType,
            disabled: false,
            hasOpacitySlider: layerSettings.has_opacity_slider,
            legendMapping: layerSettings.legend_mapping,
            cssClassPrefix: layerSettings.css_class_prefix,
            active: layerSettings.display === initialActive ? true : false,
        });
    }
});

var LayersCollection = Backbone.Collection.extend({
    model: LayerModel,

    initialize: function(model, options) {
        var self = this;
        if (options) {
            _.each(settings.get(options.type), function(layer) {
                var layerModel = new LayerModel();
                layerModel.buildLayer(layer, options.type, options.initialActive);
                self.add(layerModel);
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

    fetchLayers: function(map) {
        var self = this,
            pointSrcAPIUrl = '/api/modeling/point-source/';
        var vizer = new VizerLayers();
        this.set('polling', true);

        $.when(vizer.getLayers(), $.ajax({ 'url': pointSrcAPIUrl, 'type': 'GET'}))
            .done(function(observationLayers, pointSourceData) {
                self.set({
                    'polling': false,
                    'error': null,
                });

                var observationLayerObjects =_.map(observationLayers, function(leafletLayer, display) {
                        return {
                                leafletLayer: leafletLayer,
                                display: display,
                                active: false,
                                layerType: 'observations'
                            };
                    }),
                    observationLayersCollection = new Backbone.Collection(observationLayerObjects);

                if (pointSourceData) {
                    try {
                        var parsedPointSource = JSON.parse(pointSourceData[0]),
                            numberOfPoints = parsedPointSource.features.length;
                        observationLayersCollection.add({
                            leafletLayer: pointSourceLayer.Layer.createLayer(pointSourceData[0], map),
                            display: 'EPA Permitted Point Sources (' + numberOfPoints + ')',
                            active: false,
                            code: 'pointsource',
                            layerType: 'observations'
                        });
                    } catch (e) {
                        console.error('Unable to parse point source data');
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
        var defaultBaseLayer = _.findWhere(settings.get('base_layers'), function(layer) {
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
        /* The timeout is set to 45 seconds here, while in the
           src/mmw/apps/modeling/tasks.py file it is set to 42
           seconds.  That was done because the countdown starts in the
           front-end before it does in the back-end and the we would
           like them to finish at approximately the same time (with the
           back-end finishing earlier if they are not synced). */
        timeout: 45000
    },

    url: function() {
        if (this.get('job')) {
            return '/api/' + this.get('taskType') + '/jobs/' + this.get('job') + '/';
        } else {
            return '/api/' + this.get('taskType') + '/start/' + this.get('taskName') + '/';
        }
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
                method: 'POST',
                data: taskHelper.postData
            }),
            pollingDefer = $.Deferred();

            startDefer.done(function() {
                self.pollForResults(pollingDefer)
                    .done(taskHelper.pollSuccess)
                    .fail(function(error) {
                        if (error && error.cancelledJob) {
                            console.log('Job ' + error.cancelledJob + ' was cancelled.');
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

            self.fetch()
                .done(function(response) {
                    console.log('Polling ' + self.url());
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
    message: null,
    iconClass: null,

    setError: function(message) {
        this.set('message', message);
        this.set('iconClasses', 'fa fa-exclamation-triangle');
    },

    setTimeoutError: function() {
        var message = 'Operation took too long <br />' +
                      'Consider trying a smaller area of interest.';

        this.set('message', message);
        this.set('iconClasses', 'fa fa-exclamation-triangle');
    },

    setWorking: function(message) {
        this.set('message', message);
        this.set('iconClasses', 'fa fa-circle-o-notch fa-spin');
    }
});

// A collection of data points, useful for tables.
var LandUseCensusCollection = Backbone.Collection.extend({
    comparator: 'nlcd'
});

var SoilCensusCollection = Backbone.Collection.extend({
    comparator: 'code'
});

var AnimalCensusCollection = Backbone.Collection.extend({
    comparator: 'type'
});

var PointSourceCensusCollection = Backbone.PageableCollection.extend({
    comparator: 'city',
    mode: 'client',
    state: { pageSize: 50, firstPage: 1 }
});

var CatchmentWaterQualityCensusCollection = Backbone.PageableCollection.extend({
    comparator: 'nord',
    mode: 'client',
    state: { pageSize: 50, firstPage: 1 }
});

var GeoModel = Backbone.Model.extend({
    M_IN_KM: 1000000,

    defaults: {
        name: '',
        shape: null,        // GeoJSON
        area: '0',
        units: 'm<sup>2</sup>',
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

        // If the area is less than 1 km, use m
        if (areaInMeters < this.M_IN_KM) {
            this.set(area, areaInMeters);
            this.set(units, 'm<sup>2</sup>');
        } else {
            this.set(area, areaInMeters / this.M_IN_KM);
            this.set(units, 'km<sup>2</sup>');
        }
    },

    setValidForAnalysis: function() {
        var shape = this.get('shape');
        this.set('isValidForAnalysis', drawUtils.isValidForAnalysis(shape));
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
        was_analyze_visible: false,
        was_model_visible: false,
        was_compare_visible: false,
    }
});

module.exports = {
    MapModel: MapModel,
    LayerTabCollection: LayerTabCollection,
    TaskModel: TaskModel,
    TaskMessageViewModel: TaskMessageViewModel,
    LandUseCensusCollection: LandUseCensusCollection,
    SoilCensusCollection: SoilCensusCollection,
    AnimalCensusCollection: AnimalCensusCollection,
    PointSourceCensusCollection: PointSourceCensusCollection,
    CatchmentWaterQualityCensusCollection: CatchmentWaterQualityCensusCollection,
    GeoModel: GeoModel,
    AreaOfInterestModel: AreaOfInterestModel,
    AppStateModel: AppStateModel
};
