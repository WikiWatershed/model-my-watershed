"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    turfArea = require('turf-area'),
    toWKT = require('wellknown').stringify,
    settings = require('../core/settings'),
    utils = require('../core/utils'),
    coreModels = require('../core/models');

var LayerModel = Backbone.Model.extend({});

// Each layer returned from the analyze endpoint.
// Land, soil, etc.
var LayerCollection = Backbone.Collection.extend({
    url: '/api/',
    model: LayerModel
});

// Each category that makes up the areas of each layer
var LayerCategoryCollection = Backbone.Collection.extend({

});

var WorksheetModel = coreModels.TaskModel.extend({
    defaults: _.extend({
            name: 'worksheet',
            displayName: 'Worksheet',
            area_of_interest: null,
            wkaoi: null,
            taskName: 'modeling/worksheet',
            taskType: 'api',
            token: settings.get('api_token'),
        }, coreModels.TaskModel.prototype.defaults
    ),

    runWorksheetAnalysis: function() {
        var self = this,
            aoi = self.get('area_of_interest'),
            wkaoi = self.get('wkaoi'),
            result = self.get('result');

        if (aoi &&
            !result &&
            !utils.isWKAoIValid(wkaoi) &&
            self.runWorksheetPromise === undefined) {
            var taskHelper = {
                    contentType: 'application/json',
                    queryParams: null,
                    postData: JSON.stringify(aoi),
                },
                promises = self.start(taskHelper);

            self.runWorksheetPromise = $.when(promises.startPromise,
                                              promises.pollingPromise);

            self.runWorksheetPromise
                .always(function() {
                    delete self.runWorksheetPromise;
                });
        }

        return self.runWorksheetPromise || $.when();
    },
});

var AnalyzeTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend( {
            name: 'analysis',
            displayName: 'Analysis',
            area_of_interest: null,
            wkaoi: null,
            taskName: 'analyze',
            taskType: 'api',
            token: settings.get('api_token'),
            // Include this task in Catalog Search results (ie, BigCZ)
            enabledForCatalogMode: false,
            lazy: false, // Will not execute immediately if lazy is true
        }, coreModels.TaskModel.prototype.defaults
    ),

    /**
     * Returns a promise that completes when Analysis has been fetched. If
     * fetching is not required, returns an immediatley resolved promise.
     */
    fetchAnalysisIfNeeded: function() {
        var self = this,
            aoi = self.get('area_of_interest'),
            wkaoi = self.get('wkaoi'),
            result = self.get('result'),
            status = self.get('status'),
            // An analysis is in an End State if it has failed,
            // or completed with a result
            inEndState = status === 'failed' || (status === 'complete' && !!result);

        if (aoi && !inEndState && self.fetchAnalysisPromise === undefined) {
            var gaEvent = self.get('name') + '-analyze',
                gaLabel = utils.isInDrb(aoi) ? 'drb-aoi' : 'national-aoi',
                gaAoiSize = turfArea(aoi) / 1000000;
            window.ga('send', 'event', 'Analyze', gaEvent, gaLabel, parseInt(gaAoiSize));

            var isWkaoi = utils.isWKAoIValid(wkaoi),
                taskHelper = {
                    contentType: 'application/json',
                    postData: isWkaoi ? 
                        JSON.stringify({ wkaoi : wkaoi }) : 
                        JSON.stringify({ area_of_interest : aoi })
                },
                promises = self.start(taskHelper);

            self.fetchAnalysisPromise = $.when(promises.startPromise,
                                               promises.pollingPromise);
            self.fetchAnalysisPromise
                .fail(function(err) {
                    self.set('error', err);
                })
                .always(function() {
                    delete self.fetchAnalysisPromise;
                });
        }

        return self.fetchAnalysisPromise || $.when();
    },

    getResultCSV: function() {
        var toCSVString = function(x) {
            if (_.isNull(x)) { return '""'; }
            if (_.isObject(x) && _.has(x, 'type') && _.has(x, 'coordinates')) {
                return '"' + toWKT(x) + '"';
            }
            return '"' + String(x) + '"';
        };

        if (this.get('status') === 'complete') {
            var result = this.get('result'),
                header = _.keys(result.survey.categories[0]).join(','),
                values = _.map(result.survey.categories, function(c) {
                        return _(c).values().map(toCSVString).value().join(',');
                    }).join('\n');

            return header + '\n' + values;
        }

        return "";
    }
});

var AnalyzeTaskCollection = Backbone.Collection.extend({
    model: AnalyzeTaskModel
});

var AnalyzeTaskGroupModel = Backbone.Model.extend({
    defaults: {
        name: 'analysis',
        displayName: 'Analysis',
        enabledForCatalogMode: false,
        tasks: null, // AnalyzeTaskCollection
        activeTask: null
    },

    initialize: function() {
        var tasks = this.get('tasks');

        // Convert tasks array to collection
        this.set('tasks', new AnalyzeTaskCollection(tasks));
    },

    /**
     * Returns a promise that completes when Analysis has been fetched. If
     * fetching is not required, returns an immediatley resolved promise.
     * Skips lazy analyses, which should be triggered explicitly on the task.
     */
    fetchAnalysisIfNeeded: function() {
        var taskAnalysisFetches =
            this.get('tasks')
                .filter(function(t) { return !t.get('lazy'); })
                .map(function(t) { return t.fetchAnalysisIfNeeded(); });

        return $.when.apply($, taskAnalysisFetches);
    },

    /**
     * Gets the task that is active in the group.
     * This is the task that will be displayed in the UI.
     */
    getActiveTask: function() {
        var self = this,
            activeTask = self.get('activeTask'),
            tasks = self.get('tasks');

        if(activeTask) {
            return activeTask;
        }

        if(tasks.length > 0) {
            return tasks.first();
        }

        return null;
    },

    /**
     * Gets the active task to be displayed based on
     * the task name.
     */
    setActiveTask: function(taskName) {
        var self = this,
            tasks = self.get('tasks'),
            task = tasks.findWhere({ name: taskName });

        self.set('activeTask', task);
    }
});

var AnalyzeTaskGroupCollection = Backbone.Collection.extend({
    model: AnalyzeTaskGroupModel
});

function createAnalyzeTaskGroupCollection(aoi, wkaoi) {
    var taskGroups = [
        {
            name: "streams",
            displayName: "Streams",
            tasks: [
                {
                    name: "streams_nhd",
                    displayName: "NHD Medium Resolution Streams",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/streams/nhd",
                },
                {
                    name: "streams_nhdhr",
                    displayName: "NHD High Resolution Streams",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/streams/nhdhr",
                    lazy: true,
                },
            ]
        },
        {
            name: "land",
            displayName: "Land",
            tasks: [
                {
                    name: "land_2019_2019",
                    displayName: "Land Use/Cover 2019 (NLCD19)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/land/2019_2019",
                    enabledForCatalogMode: true
                },
                {
                    name: "land_2019_2016",
                    displayName: "Land Use/Cover 2016 (NLCD19)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/land/2019_2016",
                    enabledForCatalogMode: true
                },
                {
                    name: "land_2019_2011",
                    displayName: "Land Use/Cover 2011 (NLCD19)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/land/2019_2011",
                    enabledForCatalogMode: true
                },
                {
                    name: "land_2019_2006",
                    displayName: "Land Use/Cover 2006 (NLCD19)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/land/2019_2006",
                    enabledForCatalogMode: true
                },
                {
                    name: "land_2019_2001",
                    displayName: "Land Use/Cover 2001 (NLCD19)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/land/2019_2001",
                    enabledForCatalogMode: true
                },
                {
                    name: "land_2011_2011",
                    displayName: "Land Use/Cover 2011 (NLCD11)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/land/2011_2011",
                    enabledForCatalogMode: true
                },
                {
                    name: "protected_lands",
                    displayName: "Protected lands distribution",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/protected-lands"
                },
                {
                    name: "drb_2100_land_centers",
                    displayName: "DRB 2100 land forecast (Centers)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/drb-2100-land/centers"
                },
                {
                    name: "drb_2100_land_corridors",
                    displayName: "DRB 2100 land forecast (Corridors)",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/drb-2100-land/corridors"
                },
            ]
        },
        {
            name: "soil",
            displayName: "Soil",
            tasks: [
                {
                    name: "soil",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/soil",
                    enabledForCatalogMode: true,
                },
            ]
        },
        {
            name: "terrain",
            displayName: "Terrain",
            tasks: [
                {
                    name: "terrain",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/terrain"
                }
            ]
        },
        {
            name: "climate",
            displayName: "Climate",
            tasks: [
                {
                    name: "climate",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/climate",
                    enabledForCatalogMode: true,
                },
            ]
        },
        {
            name: "pointsource",
            displayName: "Pt Sources",
            tasks: [
                {
                    name: "pointsource",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/pointsource"
                }
            ]
        },
        {
            name: "animals",
            displayName: "Animals",
            tasks: [
                {
                    name: "animals",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/animals"
                }
            ]
        },
        {
            name: "catchment_water_quality",
            displayName: "Water Qual",
            tasks: [
                {
                    name: "catchment_water_quality",
                    area_of_interest: aoi,
                    wkaoi: wkaoi,
                    taskName: "analyze/catchment-water-quality"
                }
            ]
        },
    ];

    if (settings.get('data_catalog_enabled')) {
        taskGroups = _(taskGroups)
            // Remove tasks not supported in data catalog mode
            .map(function(tg) {
                tg.tasks = _.filter(tg.tasks, { enabledForCatalogMode: true });
                return tg;
            })
            // Remove task groups with no tasks
            .filter(function(tg) {
                return !_.isEmpty(tg.tasks);
            })
            .value();
    }

    if (!utils.isInDrb(aoi)) {
        var isDrbTask = function(task) {
            return task.name.startsWith('drb');
        };

        taskGroups = _(taskGroups)
            // Remove tasks that are DRB only
            .map(function(tg) {
                tg.tasks = _.reject(tg.tasks, isDrbTask);
                return tg;
            })
            // Remove task groups with no tasks
            .filter(function(tg) {
                return !_.isEmpty(tg.tasks);
            })
            .value();
    }

    return new AnalyzeTaskGroupCollection(taskGroups);
}

module.exports = {
    AnalyzeTaskGroupModel: AnalyzeTaskGroupModel,
    LayerModel: LayerModel,
    LayerCollection: LayerCollection,
    LayerCategoryCollection: LayerCategoryCollection,
    createAnalyzeTaskGroupCollection: createAnalyzeTaskGroupCollection,
    WorksheetModel: WorksheetModel,
};
