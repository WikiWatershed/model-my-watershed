"use strict";

var Backbone = require('../../shim/backbone'),
    $ = require('jquery'),
    _ = require('lodash'),
    turfArea = require('turf-area'),
    L = require('leaflet'),
    utils = require('./utils'),
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
        this._setSizeOptions({ single: true }, { min: true }, fit);
    },

    setDrawWithBarSize: function(fit) {
        this._setSizeOptions({ single: true  }, { med: true }, fit);
    },

    setAnalyzeSize: function(fit) {
        this._setSizeOptions({ single: true  }, { large: true }, fit);
    },

    _setSizeOptions: function(top, bottom, fit, noHeader) {
        this.set('size', { top: top, bottom: bottom, fit: !!fit, noHeader: noHeader });
    }

});

var LayerGroupModel = Backbone.Model.extend({
    defaults: {
        name: null,
        layers: null,
        layersDeferred: null,
        mustHaveActive: false,
        canSelectMultiple: false,
    }
});

var LayersModel = Backbone.Model.extend({
    defaults: {
        _googleMaps: (window.google ? window.google.maps : null)
    },

    initialize: function() {
        var defaultBaseLayer = _.findWhere(settings.get('base_layers'), function(layer) {
                return layer.default === true;
            }),
            defaultBaseLayerName = defaultBaseLayer ? defaultBaseLayer['display'] : 'Streets';
        this.baseLayers = this.buildLayers('base_layers', defaultBaseLayerName);
        this.coverageLayers = this.buildLayers('coverage_layers');
        this.boundaryLayers = this.buildLayers('boundary_layers');
        this.streamLayers = this.buildLayers('stream_layers');

        var vizer = new VizerLayers();
        this.observationsDeferred = vizer.getLayers();
    },

    buildLayers: function(layerType, initialActive) {
        var self = this,
            layers = [];

        _.each(settings.get(layerType), function(layer) {
            var leafletLayer;

            // Check to see if the google api service has been loaded
            // before creating a google layer
            if (layer.googleType){
                if (self._googleMaps) {
                    leafletLayer = new L.Google(layer.googleType, {
                        maxZoom: layer.maxZoom
                    });
                }
            } else {
                var tileUrl = (layer.url.match(/png/) === null ?
                                layer.url + '.png' : layer.url);
                _.defaults(layer, {
                    zIndex: utils.layerGroupZIndices[layerType],
                    attribution: '',
                    minZoom: 0});
                leafletLayer = new L.TileLayer(tileUrl, layer);
            }

            layers.push({
                leafletLayer: leafletLayer,
                display: layer.display,
                code: layer.code,
                perimeter: layer.perimeter,
                maxZoom: layer.maxZoom,
                minZoom: layer.minZoom,
                googleType: layer.googleType,
                disabled: false,
                active: layer.display === initialActive ? true : false,
            });
        });
        return new Backbone.Collection(layers);
    },

    getCurrentActiveBaseLayer: function() {
        return this.baseLayers.findWhere({ 'active': true });
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
    },

    initialize: function() {
        this.setDisplayArea();
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
        current_page_title: 'Select Area of Interest'
    }
});

module.exports = {
    MapModel: MapModel,
    LayersModel: LayersModel,
    LayerGroupModel: LayerGroupModel,
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
