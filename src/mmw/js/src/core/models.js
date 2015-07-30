"use strict";

var Backbone = require('../../shim/backbone'),
    $ = require('jquery'),
    _ = require('lodash'),
    turfArea = require('turf-area');

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
            var aoi = this.get('areaOfInterest').geometry ?
                      this.get('areaOfInterest').geometry :
                      this.get('areaOfInterest');

            if (aoi.type !== 'MultiPolygon') {
                if (aoi.type === 'Polygon') {
                    aoi.coordinates = [aoi.coordinates];
                } else if (aoi.type === 'FeatureCollection') {
                    aoi.coordinates = [aoi.features[0].geometry.coordinates];
                }

                aoi.type = 'MultiPolygon';
            }

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

    setHalfSize: function(fit) {
        this.set('size', { half: true, fit: !!fit });
    },

    setFullSize: function(fit) {
        this.set('size', { half: false, fit: !!fit });
    },

});

var TaskModel = Backbone.Model.extend({
    defaults: {
        pollInterval: 500,
        timeout: 5000
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
        var self = this;

        self
            .fetch({
                method: 'POST',
                data: taskHelper.postData
            })
            .done(function() {
                self.pollForResults()
                    .done(taskHelper.pollSuccess)
                    .fail(function(error) {
                        if (error && error.cancelledJob) {
                            console.log('Job ' + error.cancelledJob + ' was cancelled.');
                        } else {
                            taskHelper.pollFailure();
                        }
                    })
                    .always(taskHelper.pollEnd);
            })
            .fail(taskHelper.startFailure);
    },

    pollForResults: function() {
        // expectedJob is the value of this.get('job')
        // associated with a single call to start(). If start()
        // is called again, the values of this.get('job') and
        // expectedJob will diverge.
        var defer = $.Deferred(),
            duration = 0,
            self = this,
            expectedJob = self.get('job');

        // Check the task endpoint to see if the job is
        // completed. If it is, return the results of
        // the job. If not, check again after
        // pollInterval has elapsed.
        var getResults = function() {
            if (duration >= self.get('timeout')) {
                defer.reject();
                return;
            }

            // If job was cancelled.
            if (expectedJob !== self.get('job')) {
                defer.reject({cancelledJob: expectedJob});
                return;
            }

            self.fetch()
                .done(function(response) {
                    console.log('Polling ' + self.url());
                    if (response.status !== 'complete') {
                        duration = duration + self.get('pollInterval');
                        window.setTimeout(getResults, self.get('pollInterval'));
                    } else {
                        defer.resolve(response);
                    }
                })
                .fail(defer.reject);
        };

        window.setTimeout(getResults, self.get('pollInterval'));
        return defer.promise();
    }
});

// A collection of data points, useful for tables.
var DataCollection = Backbone.Collection.extend({});

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

    setDisplayArea: function() {
        if (!this.get('shape')) { return; }

        var areaInMeters = turfArea(this.get('shape'));

        // If the area is less than 1 km, use m
        if (areaInMeters < this.M_IN_KM) {
            this.set('area', areaInMeters);
        } else {
            this.set('area', areaInMeters / this.M_IN_KM);
            this.set('units', 'km<sup>2</sup>');
        }
    }
});

var AreaOfInterestModel = GeoModel.extend({
    defaults: _.extend({
        place: 'Selected Area',
        can_go_back: false
    }, GeoModel.prototype.defaults)
});

module.exports = {
    MapModel: MapModel,
    TaskModel: TaskModel,
    DataCollection: DataCollection,
    GeoModel: GeoModel,
    AreaOfInterestModel: AreaOfInterestModel
};
