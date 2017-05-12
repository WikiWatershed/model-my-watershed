"use strict";

var $ = require('jquery'),
    lodash = require('lodash'),
    Backbone = require('../../shim/backbone'),
    coreModels = require('../core/models');

var LayerModel = Backbone.Model.extend({});

// Each layer returned from the analyze endpoint.
// Land, soil, etc.
var LayerCollection = Backbone.Collection.extend({
    url: '/api/modeling/',
    model: LayerModel
});

// Each category that makes up the areas of each layer
var LayerCategoryCollection = Backbone.Collection.extend({

});

var AnalyzeTaskModel = coreModels.TaskModel.extend({
    defaults: lodash.extend( {
            name: 'analysis',
            displayName: 'Analysis',
            area_of_interest: null,
            taskName: 'analyze',
            taskType: 'modeling'
        }, coreModels.TaskModel.prototype.defaults
    ),

    /**
     * Returns a promise that completes when Analysis has been fetched. If
     * fetching is not required, returns an immediatley resolved promise.
     */
    fetchAnalysisIfNeeded: function() {
        var self = this,
            aoi = self.get('area_of_interest'),
            result = self.get('result');

        if (aoi && !result && self.fetchAnalysisPromise === undefined) {
            var promises = self.start({
                postData: {
                    'analyze_input': JSON.stringify({
                        'area_of_interest': aoi
                    })
                }
            });
            self.fetchAnalysisPromise = $.when(promises.startPromise,
                                               promises.pollingPromise);
            self.fetchAnalysisPromise
                .always(function() {
                    delete self.fetchAnalysisPromise;
                });
        }

        return self.fetchAnalysisPromise || $.when();
    }
});

var AnalyzeTaskCollection = Backbone.Collection.extend({
    model: AnalyzeTaskModel
});

function createAnalyzeTaskCollection(aoi) {
    return new AnalyzeTaskCollection([
        {
            name: "land",
            displayName: "Land",
            area_of_interest: aoi,
            taskName: "analyze/land"
        },
        {
            name: "soil",
            displayName: "Soil",
            area_of_interest: aoi,
            taskName: "analyze/soil"
        },
        {
            name: "animals",
            displayName: "Animals",
            area_of_interest: aoi,
            taskName: "analyze/animals"
        },
        {
            name: "pointsource",
            displayName: "Point Sources",
            area_of_interest: aoi,
            taskName: "analyze/pointsource"
        },
        {
            name: "catchment_water_quality",
            displayName: "Water Quality",
            area_of_interest: aoi,
            taskName: "analyze/catchment-water-quality"
        }
    ]);
}

module.exports = {
    AnalyzeTaskModel: AnalyzeTaskModel,
    LayerModel: LayerModel,
    LayerCollection: LayerCollection,
    LayerCategoryCollection: LayerCategoryCollection,
    createAnalyzeTaskCollection: createAnalyzeTaskCollection,
};
