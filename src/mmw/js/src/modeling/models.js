"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
    App = require('../app'),
    coreModels = require('../core/models');

var ModelPackageModel = Backbone.Model.extend({});

var Tr55TaskModel = coreModels.TaskModel.extend({});

var ResultModel = Backbone.Model.extend({});

var ResultCollection = Backbone.Collection.extend({
    model: ResultModel
});

var ProjectModel = Backbone.Model.extend({});

var ScenarioModel = Backbone.Model.extend({
    initialize: function() {
        this.slugifyName();
    },

    defaults: {
        currentConditions: false
    },

    slugifyName: function() {
        var slug = this.get('name')
                       .toLowerCase()
                       .replace(/ /g, '-') // Spaces to hyphens
                       .replace(/[^\w-]/g, ''); // Remove non-alphanumeric characters

        this.set('slug', slug);
    }
});

var ScenariosCollection = Backbone.Collection.extend({});

module.exports = {
    ResultModel: ResultModel,
    ResultCollection: ResultCollection,
    ModelPackageModel: ModelPackageModel,
    Tr55TaskModel: Tr55TaskModel,
    ProjectModel: ProjectModel,
    ScenarioModel: ScenarioModel,
    ScenariosCollection: ScenariosCollection
};
