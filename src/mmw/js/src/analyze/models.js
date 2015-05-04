"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
    App = require('../app'),
    coreModels = require('../core/models');

var AnalyzeModel = Backbone.Model.extend({
    defaults: {
        area: 10,
        place: 'Philadelphia'
    }
});

var LayerModel = Backbone.Model.extend({

});

// Each layer returned from the analyze endpoint.
// Land, soil, etc.
var LayerCollection = Backbone.Collection.extend({
    url: '/api/analyze/',
    model: LayerModel
});

// Each category that makes up the areas of each layer
var LayerCategoryCollection = Backbone.Collection.extend({

});

var AnalyzeTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: 'analyze',
            taskType: 'analyze'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

module.exports = {
    AnalyzeModel: AnalyzeModel,
    AnalyzeTaskModel: AnalyzeTaskModel,
    LayerModel: LayerModel,
    LayerCollection: LayerCollection,
    LayerCategoryCollection: LayerCategoryCollection
};
