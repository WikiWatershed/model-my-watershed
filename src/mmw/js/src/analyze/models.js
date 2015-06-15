"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
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
    defaults: _.extend( {
            taskName: 'analyze',
            taskType: 'modeling'
        }, coreModels.TaskModel.prototype.defaults
    )
});

module.exports = {
    AnalyzeTaskModel: AnalyzeTaskModel,
    LayerModel: LayerModel,
    LayerCollection: LayerCollection,
    LayerCategoryCollection: LayerCategoryCollection
};
