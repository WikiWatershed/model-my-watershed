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

var ProjectModel = Backbone.Model.extend({
    urlRoot: '/api/modeling/projects/',

    initialize: function() {
        // TODO: For a new project, users will eventually
        // be able to choose which modeling package
        // they want to use in their project. For
        // now, the only option is TR55, so it is
        // hard-coded here. This will likely be a model
        // itself in the future, with more modification
        // and input control data.
        this.set('model_package', 'tr-55');
        this.set('active_scenario_slug', 'current-conditions');
        this.set('taskModel', new Tr55TaskModel());
    },

    saveAll: function() {
        var self = this;

        // If we haven't saved the project before,
        // hold on to the scenarios so that we can
        // save each one once we have an ID for the project
        if (this.isNew) {
            var tempScenarios = this.get('scenarios');
        }

        this.save()
            .done(function(resp) {
                console.log('Saved project');

                var scenarios = tempScenarios ? tempScenarios : self.get('scenarios');

                scenarios.each(function(scenario) {
                    if (!scenario.get('project')) {
                        scenario.set('project', self.get('id'));
                    }

                    scenario
                        .save()
                        .done(function(resp) {
                            console.log('Saved scenario');
                        })
                        .fail(function(resp) {
                            console.log('Failed to save scenario');
                        });
                });
            })
            .fail(function(resp) {
                console.log('Failed to save project');
            });
    },

    parse: function(response, options) {
        var scenariosCollection = new ScenariosCollection();

        scenariosCollection.reset(response.scenarios);

        response.scenarios = scenariosCollection;
        response.taskModel = new Tr55TaskModel();

        return response;
    }
});

var ScenarioModel = Backbone.Model.extend({
    urlRoot: '/api/modeling/scenarios/',

    initialize: function() {
        this.slugifyName();
    },

    defaults: {
        currentConditions: false,
        active: false
    },

    slugifyName: function() {
        var slug = this.makeSlug(this.get('name'));
        this.set('slug', slug);
    },

    makeSlug: function(name) {
        return name.toLowerCase()
                   .replace(/ /g, '-') // Spaces to hyphens
                   .replace(/[^\w-]/g, ''); // Remove non-alphanumeric characters
    }
});

var ScenariosCollection = Backbone.Collection.extend({
    model: ScenarioModel,
    comparator: 'created_at'
});

module.exports = {
    ResultModel: ResultModel,
    ResultCollection: ResultCollection,
    ModelPackageModel: ModelPackageModel,
    Tr55TaskModel: Tr55TaskModel,
    ProjectModel: ProjectModel,
    ScenarioModel: ScenarioModel,
    ScenariosCollection: ScenariosCollection
};
