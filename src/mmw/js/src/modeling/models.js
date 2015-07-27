"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
    utils = require('../core/utils'),
    settings = require('../core/settings'),
    App = require('../app'),
    coreModels = require('../core/models');

var ModelPackageControlModel = Backbone.Model.extend({
    defaults: {
        name: ''
    },

    // Return true if this is an input control and false if it is a
    // modification control.
    isInputControl: function() {
        return _.contains([
            'precipitation'
        ], this.get('name'));
    }
});

var ModelPackageControlsCollection = Backbone.Collection.extend({
    model: ModelPackageControlModel,

    comparator: function(model) {
        return model.get('name');
    }
});

var ModelPackageModel = Backbone.Model.extend();

var Tr55TaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: 'tr55',
            taskType: 'modeling'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

var ResultModel = Backbone.Model.extend({
    defaults: {
        name: '',
        displayName: '',
        inputmod_hash: null,
        result: null,
        polling: false
    }
});

var ResultCollection = Backbone.Collection.extend({
    model: ResultModel,

    comparator: function(model) {
        return model.get('name');
    },

    setPolling: function(polling) {
        this.forEach(function(resultModel) {
            resultModel.set('polling', polling);
        });
    },

    setNullResults: function() {
        this.forEach(function(resultModel) {
            resultModel.set('result', null);
        });
    }
});

var ProjectModel = Backbone.Model.extend({
    urlRoot: '/api/modeling/projects/',

    defaults: {
        name: '',
        created_at: null,          // Date
        area_of_interest: null,    // GeoJSON
        model_package: '',         // Package name
        scenarios: null,           // ScenariosCollection
        user_id: 0,                // User that created the project
        is_activity: false,        // Project that persists across routes
        needs_reset: false         // Should we overwrite project data on next save?
    },

    initialize: function() {
        var scenarios = this.get('scenarios');
        if (scenarios === null || typeof scenarios === 'string') {
            this.set('scenarios', new ScenariosCollection());
        }
        // TODO: For a new project, users will eventually
        // be able to choose which modeling package
        // they want to use in their project. For
        // now, the only option is TR55, so it is
        // hard-coded here.
        this.set('model_package', 'tr-55');

        this.set('user_id', App.user.get('id'));

        // If activity mode is enabled make sure to initialize the project as
        // an activity.
        this.set('is_activity', settings.get('activityMode'));

        this.listenTo(this.get('scenarios'), 'add', this.addIdsToScenarios, this);
        this.on('change:name', this.saveProjectAndScenarios, this);
    },

    createTaskModel: function() {
        var packageName = this.get('model_package');
        switch (packageName) {
            case 'tr-55':
                return new Tr55TaskModel();
        }
        throw 'Model package not supported: ' + packageName;
    },

    createTaskResultCollection: function() {
        var packageName = this.get('model_package');
        switch (packageName) {
            case 'tr-55':
                return new ResultCollection([
                    {
                        name: 'runoff',
                        displayName: 'Runoff',
                        result: null
                    },
                    {
                        name: 'quality',
                        displayName: 'Water Quality',
                        result: null
                    }
                ]);
        }
        throw 'Model package not supported: ' + packageName;
    },

    getResultsIfNeeded: function() {
        this.get('scenarios').forEach(function(scenario) {
            scenario.getResultsIfNeeded();
        });
        this.get('scenarios').on('add', function(scenario) {
            scenario.getResultsIfNeeded();
        });
    },

    updateName: function(newName) {
        // TODO: Having fetched a users list of projects,
        // ensure that this new name is unique prior to saving
        this.set('name', newName);
    },

    // Flag to prevent double POSTing of a project.
    saveCalled: false,

    saveProjectAndScenarios: function() {
        if (!App.user.loggedInUserMatch(this.get('user_id'))) {
            // Fail fast if the user can't save the project.
            return;
        }

        if (this.isNew() && this.saveCalled) {
            // Fail fast if we are in the middle of our first save.
            return;
        } else if (this.isNew() && !this.saveCalled) {
            // We haven't saved the project before, save the project and then
            // set the project ID on each scenario.
            var self = this;
            this.saveCalled = true;
            this.save()
                .done(function() {
                    self.updateProjectScenarios(self.get('id'), self.get('scenarios'));
                })
                .fail(function() {
                    console.log('Failed to save project');
                });
        } else {
            this.save()
                .fail(function() {
                    console.log('Failed to save project');
                });
        }
    },

    addIdsToScenarios: function() {
        var projectId = this.get('id');
        if (!projectId) {
            this.saveProjectAndScenarios();
        } else {
            this.updateProjectScenarios(projectId, this.get('scenarios'));
        }
    },

    updateProjectScenarios: function(projectId, scenarios) {
        scenarios.each(function(scenario) {
            if (!scenario.get('project')) {
                scenario.set('project', projectId);
            }
        });
    },

    parse: function(response) {
        if (response.scenarios) {
            // If we returned scenarios (probably from a GET) then set them.
            var user_id = response.user.id,
                scenariosCollection = this.get('scenarios'),
                scenarios = _.map(response.scenarios, function(scenario) {
                    var scenarioModel = new ScenarioModel(scenario);
                    scenarioModel.set('user_id', user_id);
                    scenarioModel.get('modifications').reset(scenario.modifications);
                    if (!_.isEmpty(scenario.results)) {
                        scenarioModel.get('results').reset(scenario.results);
                    }

                    return scenarioModel;
                });
            scenariosCollection.reset(scenarios);
            // Set the user_id to ensure controls are properly set.
            response.user_id = user_id;

            delete response.scenarios;
        }

        return response;
    },

    getReferenceUrl: function() {
        // Return a url fragment that can access this project at its
        // current state /project/<id>/scenario/<id>
        var root = '/project/';

        if (this.get('id')) {
            var modelPart = this.id,
                scenarioPart = '',
                activeScenario = this.get('scenarios').getActiveScenario();

            if (activeScenario && activeScenario.id) {
                scenarioPart = '/scenario/' + activeScenario.id;
            }

            return root + modelPart + scenarioPart;
        }
        return root;
    }
});

var ModificationModel = coreModels.GeoModel.extend({
    defaults: _.extend({
            name: '',
            type: ''
        }, coreModels.GeoModel.prototype.defaults
    )
});

var ModificationsCollection = Backbone.Collection.extend({
    model: ModificationModel,

    comparator: function(model) {
        // Even though model.get('area') is a numeric value, passing it
        // along with the others here causes a string comparison. But that's
        // alright, because we only want to sort consistently, not actually
        // by area, and it serves as a tie-breaker when the other values are
        // identical.
        return [model.get('name'), model.get('value'), model.get('area')];
    }
});

var ScenarioModel = Backbone.Model.extend({
    urlRoot: '/api/modeling/scenarios/',

    defaults: {
        name: '',
        is_current_conditions: false,
        user_id: 0, // User that created the project
        inputs: null, // ModificationsCollection
        inputmod_hash: null, // MD5 string
        modifications: null, // ModificationsCollection
        modification_hash: null, // MD5 string
        active: false,
        job_id: null,
        results: null, // ResultCollection
        census: null // JSON blob
    },

    initialize: function(attrs) {
        Backbone.Model.prototype.initialize.apply(this, arguments);
        this.set('user_id', App.user.get('id'));

        // TODO The default modifications might be a function
        // of the model_package in the future.
        _.defaults(attrs, {
            inputs: [
                {
                    name: 'precipitation',
                    value: 1.0
                }
            ]
        });

        this.set('inputs', new ModificationsCollection(attrs.inputs));
        this.set('modifications', new ModificationsCollection(attrs.modifications));

        this.updateModificationHash();
        this.updateInputModHash();

        this.on('change:project change:name', this.attemptSave, this);
        this.get('modifications').on('add remove change', this.updateModificationHash, this);

        var debouncedGetResults = _.debounce(_.bind(this.getResults, this), 500);
        this.get('inputs').on('add', debouncedGetResults);
        this.get('modifications').on('add remove', debouncedGetResults);

        this.set('taskModel', App.currProject.createTaskModel());
        this.set('results', App.currProject.createTaskResultCollection());
    },

    attemptSave: function() {
        if (!App.user.loggedInUserMatch(this.get('user_id'))) {
            return;
        }
        if (!this.get('project')) {
            // TODO replace this with radio/wreqr or something less problematic than the global.
            App.currProject.saveProjectAndScenarios();
            return;
        }
        if (this.isNew() && this.saveCalled) {
            return;
        } else if (this.isNew() && !this.saveCalled) {
            // Makeshift locking mechanism to prevent double saves.
            this.saveCalled = true;
        }
        this.save().fail(function() {
            console.log('Failed to save scenario');
        });
    },

    addModification: function(modification) {
        this.get('modifications').add(modification);
    },

    addOrReplaceInput: function(input) {
        var inputsColl = this.get('inputs'),
            existing = inputsColl.findWhere({ name: input.get('name') });
        if (existing) {
            inputsColl.remove(existing);
        }
        inputsColl.add(input);
    },

    parse: function(response) {
        this.get('modifications').reset(response.modifications);
        delete response.modifications;

        this.get('inputs').reset(response.inputs);
        delete response.inputs;

        if (!_.isEmpty(response.results)) {
            this.get('results').reset(response.results);
        }
        delete response.results;

        return response;
    },

    getResultsIfNeeded: function() {
        var inputmod_hash = this.get('inputmod_hash'),
            needsResults = this.get('results').some(function(resultModel) {
                var emptyResults = !resultModel.get('result'),
                    staleResults = inputmod_hash !== resultModel.get('inputmod_hash');

                return emptyResults || staleResults;
            });

        if (needsResults) {
            this.getResults();
        }
    },

    // Poll the taskModel for results and reset the results collection when done.
    // If not successful, the results collection is reset to be empty.
    getResults: function() {
        this.updateInputModHash();
        this.attemptSave();

        var self = this,
            results = this.get('results'),
            taskModel = this.get('taskModel'),
            setResults = function() {
                var rawServerResults = taskModel.get('result');
                if (rawServerResults === "" || rawServerResults === null) {
                    results.setNullResults();
                } else {
                    var serverResults = JSON.parse(rawServerResults);
                    results.forEach(function(resultModel) {
                        var resultName = resultModel.get('name');
                        if (serverResults[resultName]) {
                            resultModel.set({
                                'result': serverResults[resultName],
                                'inputmod_hash': serverResults.inputmod_hash
                            });
                        } else {
                            console.log('Response is missing ' + resultName + '.');
                        }
                    });

                    self.set('census', serverResults.census);
                }
            },
            taskHelper = {
                postData: {
                    model_input: JSON.stringify({
                        inputs: self.get('inputs').toJSON(),
                        modifications: self.get('modifications').toJSON(),
                        area_of_interest: App.currProject.get('area_of_interest'),
                        census: self.get('census'),
                        inputmod_hash: self.get('inputmod_hash'),
                        modification_hash: self.get('modification_hash')
                    })
                },

                onStart: function() {
                    results.setPolling(true);
                },

                pollSuccess: function() {
                    setResults();
                },

                pollFailure: function() {
                    console.log('Failed to get TR55 results.');
                    results.setNullResults();
                },

                pollEnd: function() {
                    results.setPolling(false);
                    self.attemptSave();
                },

                startFailure: function(response) {
                    console.log('Failed to start TR55 job.');
                    if (response.responseJSON && response.responseJSON.error) {
                        console.log(response.responseJSON.error);
                    }
                    results.setNullResults();
                    results.setPolling(false);
                }
            };

        taskModel.start(taskHelper);
    },

    updateInputModHash: function() {
        var hash = utils.getCollectionHash(this.get('inputs'));

        if (this.get('modification_hash')) {
            hash += this.get('modification_hash');
        }

        this.set('inputmod_hash', hash);
    },

    updateModificationHash: function() {
        var hash = utils.getCollectionHash(this.get('modifications'));

        this.set('modification_hash', hash);
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
            this.setActiveScenarioByCid(first.cid);
        }
    },

    setActiveScenario: function(scenario) {
        if (scenario) {
            this.invoke('set', 'active', false);
            scenario.set('active', true);
            this.trigger('change:activeScenario', scenario);
            return true;
        }

        return false;
    },

    setActiveScenarioById: function(scenarioId) {
        return this.setActiveScenario(this.get(scenarioId));
    },

    setActiveScenarioByCid: function(cid) {
        return this.setActiveScenario(this.get({ cid: cid }));
    },

    createNewScenario: function() {
        var scenario = new ScenarioModel({
            name: this.makeNewScenarioName('New Scenario')
        });

        this.add(scenario);
        this.setActiveScenarioByCid(scenario.cid);
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
            newModel = new ScenarioModel({
                is_current_conditions: false,
                name: this.makeNewScenarioName('Copy of ' + source.get('name')),
                inputs: source.get('inputs').toJSON(),
                modifications: source.get('modifications').toJSON()
            });

        this.add(newModel);
        this.setActiveScenarioByCid(newModel.cid);
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

        for (var i = 1; _.contains(existingNames, baseName + ' ' + i); i++) {
            continue;
        }

        return baseName + ' ' + i;
    },

    getActiveScenario: function() {
        return this.findWhere({active: true});
    }
});

function getControlsForModelPackage(modelPackageName, options) {
    if (modelPackageName === 'tr-55') {
        if (options && options.is_current_conditions) {
            return new ModelPackageControlsCollection([
                new ModelPackageControlModel({ name: 'precipitation' })
            ]);
        } else {
            return new ModelPackageControlsCollection([
                new ModelPackageControlModel({ name: 'landcover' }),
                new ModelPackageControlModel({ name: 'conservation_practice' }),
                new ModelPackageControlModel({ name: 'precipitation' })
            ]);
        }
    }
    throw 'Model package not supported ' + modelPackageName;
}

module.exports = {
    getControlsForModelPackage: getControlsForModelPackage,
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
