"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
    turfArea = require('turf-area'),
    App = require('../app'),
    coreModels = require('../core/models');

var ModelPackageControlModel = Backbone.Model.extend({
    defaults: {
        name: ''
    }
});

var ModelPackageControlsCollection = Backbone.Collection.extend({
    model: ModelPackageControlModel
});

var ModelPackageModel = Backbone.Model.extend({
    defaults: {
        name: '',
        controls: null  // ModelPackageControlsCollection
    }
});

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
        // hard-coded here.
        this.set('model_package', new ModelPackageModel({
            name: 'tr-55',
            controls: new ModelPackageControlsCollection([
                new ModelPackageControlModel({ name: 'landcover' }),
                new ModelPackageControlModel({ name: 'conservation_practice' }),
                new ModelPackageControlModel({ name: 'precipitation' })
            ])
        }));
        this.set('taskModel', new Tr55TaskModel());
    },

    updateName: function(newName) {
        // TODO: Having fetched a users list of projects,
        // ensure that this new name is unique prior to saving
        this.set('name', newName);
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

var ModificationModel = Backbone.Model.extend({
    defaults: {
        name: '',
        value: '',
        shape: null,         // GeoJSON
        area: '0',
        units: 'meter(s)'
    },

    initialize: function() {
        this.setDisplayArea();
    },

    setDisplayArea: function() {
        if (!this.get('shape')) {
            return;
        }

        var areaInMeters = turfArea(this.get('shape'));

        // For areas less than an acre, use sq ft,
        // otherwise use acres
        if (areaInMeters < 4046.86) {
            this.set('area', areaInMeters * 10.7639);
            this.set('units', 'sq. ft.');
        } else {
            this.set('area', areaInMeters * 0.000247105);
            this.set('units', 'acres');
        }
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
        // TODO: When #278 is resolved, we should be doing something like this
        // to setup or restore modifications.
        // var mods = this.get('modifications') === null ? [] : JSON.parse(this.get('modifications'));
        var mods = this.get('modifications');

        if (mods === null || typeof mods === 'string') {
            this.set('modifications', new ModificationsCollection());
        }
    },

    getSlug: function() {
        var slug = this.get('name')
                       .toLowerCase()
                       .replace(/ /g, '-') // Spaces to hyphens
                       .replace(/[^\w-]/g, ''); // Remove non-alphanumeric characters
        return slug;
    },

    addModification: function(modification) {
        this.get('modifications').add(modification);
    },

    addOrReplaceModification: function(modification) {
        var modificationsColl = this.get('modifications'),
            existing = modificationsColl.findWhere({ name: modification.get('name') });
        if (existing) {
            modificationsColl.remove(existing);
        }
        modificationsColl.add(modification);
    }
});

var ScenariosCollection = Backbone.Collection.extend({
    model: ScenarioModel,
    comparator: 'created_at',

    initialize: function() {
        this.on('reset', this.makeFirstScenarioActive);
    },

    makeFirstScenarioActive: function() {
        var first = this.first();

        if (first) {
            this.setActiveScenario(first.cid);
        }
    },

    setActiveScenario: function(cid) {
        this.each(function(model) {
            var active = model.cid === cid;
            if (active) {
                var modificationsColl = model.get('modifications');
                // TODO: Move to controller
                App.getMapView().updateModifications(modificationsColl);
            }
            model.set('active', active);
        });
    },

    createNewScenario: function() {
        var scenario = new ScenarioModel({
            name: this.makeNewScenarioName('New Scenario')
        });

        this.add(scenario);
        this.setActiveScenario(scenario.cid);
    },

    updateScenarioName: function(model, newName) {
        newName = newName.trim();

        // Bail early if the name actually didn't change.
        if (model.get('name') === newName) {
            return;
        }

        var match = this.find(function(model) {
            return model.get('name').toLowerCase() === newName.toLowerCase();
        });

        if (match) {
            console.log('This name is already in use.');
            return;
        } else if (model.get('name') !== newName) {
            model.set('name', newName);
        }
    },

    duplicateScenario: function(cid) {
        var source = this.get(cid),
            sourceMods = source.get('modifications').models,
            newModel = new ScenarioModel({
                is_current_conditions: false,
                name: this.makeNewScenarioName('Copy of ' + source.get('name')),
                modifications: new ModificationsCollection(sourceMods)
            });

        this.add(newModel);
        this.setActiveScenario(newModel.cid);
    },

    // Generate a unique scenario name based off baseName.
    // Assumes a basic structure of "baseName X", where X is
    // iterated as new scenarios with the same baseName are created.
    // The first duplicate will not have an iterated X in the name.
    // The second duplicate will be "baseName 1".
    makeNewScenarioName: function(baseName) {
        var existingNames = this.pluck('name');

        if (!_.contains(existingNames, baseName)) {
            return baseName;
        }

        for (var i=1; _.contains(existingNames, baseName + ' ' + i); i++);

        return baseName + ' ' + i;
    }
});

module.exports = {
    ResultModel: ResultModel,
    ResultCollection: ResultCollection,
    ModelPackageModel: ModelPackageModel,
    ModelPackageControlsCollection: ModelPackageControlsCollection,
    ModelPackageControlModel: ModelPackageControlModel,
    Tr55TaskModel: Tr55TaskModel,
    ProjectModel: ProjectModel,
    ModificationModel: ModificationModel,
    ModificationsCollection: ModificationsCollection,
    ScenarioModel: ScenarioModel,
    ScenariosCollection: ScenariosCollection
};
