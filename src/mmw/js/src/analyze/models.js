"use strict";

var Backbone = require('../../shim/backbone'),
    App = require('../app');

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
    model: LayerModel,
    sync: function(method, model, options) {
        if (method === 'read') {
            // Convert GET into POST. All else remains the same.
            // We do this because the analisis requires large polygons as input
            // data and they make for unwieldy and potentially problematically
            // long GET strings.
            method = 'create';
        }
        return Backbone.sync(method, model, options);
    }
});

// Each category that makes up the areas of each layer
var LayerCategoryCollection = Backbone.Collection.extend({

});

module.exports = {
    AnalyzeModel: AnalyzeModel,
    LayerModel: LayerModel,
    LayerCollection: LayerCollection,
    LayerCategoryCollection: LayerCategoryCollection
};
