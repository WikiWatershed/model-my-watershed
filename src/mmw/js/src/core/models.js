"use strict";

var Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    $ = require('jquery'),
    turfArea = require('turf-area');

var MapModel = Backbone.Model.extend({
    defaults: {
        lat: 0,
        lng: 0,
        zoom: 0,
        // TODO: Delete (already exists on project model)
        areaOfInterest: null,           // GeoJSON
        halfSize: false
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

            if (aoi.type === 'Polygon') {
                aoi.type = 'MultiPolygon';
                aoi.coordinates = [aoi.coordinates];
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

module.exports = {
    MapModel: MapModel,
    TaskModel: TaskModel,
    GeoModel: GeoModel
};
