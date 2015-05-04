"use strict";

var Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    $ = require('jquery');

var MapModel = Backbone.Model.extend({
    defaults: {
        lat: 0,
        lng: 0,
        zoom: 0,
        // Active shape on the map; GeoJSON object
        areaOfInterest: null,
        halfSize: false
    }
});

var TaskModel = Backbone.Model.extend({
    defaults: {
        pollInterval: 500,
        timeout: 5000
    },

    url: function() {
        if (this.get('job')) {
            return '/api/' + this.get('taskType') + '/jobs/' + this.get('job');
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

module.exports = {
    MapModel: MapModel,
    TaskModel: TaskModel
};
