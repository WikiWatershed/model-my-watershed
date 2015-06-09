"use strict";

var Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    $ = require('jquery'),
    _ = require('lodash'),
    turfArea = require('turf-area');

var MapModel = Backbone.Model.extend({
    defaults: {
        lat: 0,
        lng: 0,
        zoom: 0,
        areaOfInterest: null,           // GeoJSON
        halfSize: false
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
    }
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

    pollForResults: function() {
        var defer = $.Deferred(),
            duration = 0,
            self = this;

        // Check the task endpoint to see if the job is
        // completed. If it is, return the results of
        // the job. If not, check again after
        // pollInterval has elapsed.
        var getResults = function() {
                if (duration >= self.get('timeout')) {
                    defer.reject();
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
    GeoModel: GeoModel,
    AreaOfInterestModel: AreaOfInterestModel
};
