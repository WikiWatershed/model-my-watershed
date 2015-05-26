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

    defaults: {
        name: '',
        created_at: null,          // Date
        area_of_interest: null,    // GeoJSON
        model_package: null,       // ModelPackageModel
        taskModel: null,           // TaskModel
        scenarios: null            // ScenariosCollection
    },

    initialize: function() {
        // TODO: For a new project, users will eventually
        // be able to choose which modeling package
        // they want to use in their project. For
        // now, the only option is TR55, so it is
        // hard-coded here. This will likely be a model
        // itself in the future, with more modification
        // and input control data.
        this.set('model_package', 'tr-55');
        this.set('taskModel', new Tr55TaskModel());

        this.makeFirstScenarioActive();
    },

    makeFirstScenarioActive: function() {
        var scenariosColl = this.get('scenarios'),
            scenario = scenariosColl.first();
        if (scenario) {
            scenariosColl.setActiveScenario(scenario.cid);
        }
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
    },

    /**
     * Return a new scenario name of the format "New Scenario X" where X is a
     * positive number and that is greater than all previous X.
     */
    makeNewScenarioName: function() {
        // When making new scenarios, we need to make sure we don't
        // accidentally give two the same name. Use a counter but ensure slug
        // name is not in use by looking at all the current names.
        var scenarios = this.get('scenarios').models;

        var numbers = _.without(_.map(scenarios, function(model) {
            var name = model.get('name'),
                regEx = /^New Scenario (\d)+/g;

            if (name.match(regEx) !== null && name.match(regEx).length === 1) {
                return parseInt(model.get('name').replace(/^New Scenario /g, ''));
            }
        }), undefined);
        if (!_.isEmpty(numbers)) {
            var max = _.max(numbers) + 1;
            return 'New Scenario ' + max;
        } else {
            return 'New Scenario 1';
        }
    },

    createNewScenario: function() {
        var scenario = new ScenarioModel({
            name: this.makeNewScenarioName()
        });
        this.get('scenarios').add(scenario);
        this.get('scenarios').setActiveScenario(scenario.cid);
    },

    updateScenarioName: function(model, newName) {
        // Bail early if the name actually didn't change.
        if (model.get('name') === newName) {
            return;
        }

        var match = _.find(this.get('scenarios').models, function(model) {
            return model.get('name') === newName;
        });
        if (match) {
            alert('This name is already in use.');
            return;
        } else if (model.get('name') !== newName) {
            model.set('name', newName);
        }
    }
});

var ModificationModel = Backbone.Model.extend({
    defaults: {
        name: '',
        type: '',
        geojson: null
    }
});

var ModificationsCollection = Backbone.Collection.extend({
    model: ModificationModel
});

var ScenarioModel = Backbone.Model.extend({
    urlRoot: '/api/modeling/scenarios/',

    defaults: {
        name: '',
        is_current_conditions: false,
        modifications: null,      // ModificationsCollection
        active: false
    },

    initialize: function() {
        // TODO: When fetching model or populating from a preloaded source
        // this attribute should not be initialized as empty.
        this.set('modifications', new ModificationsCollection());
    },

    getSlug: function() {
        var slug = this.get('name')
                       .toLowerCase()
                       .replace(/ /g, '-') // Spaces to hyphens
                       .replace(/[^\w-]/g, ''); // Remove non-alphanumeric characters
        return slug;
    }
});

var ScenariosCollection = Backbone.Collection.extend({
    model: ScenarioModel,
    comparator: 'created_at',

    setActiveScenario: function(cid) {
        this.each(function(model) {
            var active = model.cid === cid;
            if (active) {
                var modificationsColl = model.get('modifications');
                App.getMapView().updateModifications(modificationsColl);
            }
            model.set('active', active);
        });
    }
});

module.exports = {
    ResultModel: ResultModel,
    ResultCollection: ResultCollection,
    ModelPackageModel: ModelPackageModel,
    Tr55TaskModel: Tr55TaskModel,
    ProjectModel: ProjectModel,
    ModificationModel: ModificationModel,
    ModificationsCollection: ModificationsCollection,
    ScenarioModel: ScenarioModel,
    ScenariosCollection: ScenariosCollection
};
