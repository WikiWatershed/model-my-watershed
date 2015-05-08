"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
    App = require('../app'),
    coreModels = require('../core/models');

var Tr55TaskModel = coreModels.TaskModel.extend({});

var ResultModel = Backbone.Model.extend({});

var ResultCollection = Backbone.Collection.extend({
    model: ResultModel
});

module.exports = {
    ResultModel: ResultModel,
    ResultCollection: ResultCollection,
    Tr55TaskModel: Tr55TaskModel
};
