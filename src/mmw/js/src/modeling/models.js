"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
    utils = require('../core/utils'),
    settings = require('../core/settings'),
    App = require('../app'),
    coreModels = require('../core/models'),
    turfArea = require('turf-area'),
    turfErase = require('turf-erase'),
    turfIntersect = require('turf-intersect');

var GWLFE = 'gwlfe';
var TR55_TASK = 'tr55';
var TR55_PACKAGE = 'tr-55';

var ModelPackageControlModel = Backbone.Model.extend({
    defaults: {
        name: '',
        controlName: '',
        controlDisplayName: '',
        manualMode: false,
        manualMod: '',
        activeMod: '',
        modRows: null,
        dropdownOpen: false,
        dataModel: null,
        output: null
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
    model: ModelPackageControlModel
});

var ModelPackageModel = Backbone.Model.extend();

var Tr55TaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: TR55_TASK,
            taskType: 'modeling'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

var GwlfeTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: GWLFE,
            taskType: 'modeling'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

var ResultModel = Backbone.Model.extend({
    defaults: {
        name: '', // Code name for type of result, eg. runoff
        displayName: '', // Human-readable name for type of result, eg. Runoff
        inputmod_hash: null, // MD5 string generated from result
        result: null, // The actual result object
        polling: false, // True if currently polling
        active: false, // True if currently selected in Compare UI
        activeVar: null // For GWLFE, the currently selected variable in the UI
    }
});

var ResultCollection = Backbone.Collection.extend({
    model: ResultModel,

    setPolling: function(polling) {
        this.forEach(function(resultModel) {
            resultModel.set('polling', polling);
        });
    },

    setNullResults: function() {
        this.forEach(function(resultModel) {
            resultModel.set('result', null);
        });
    },

    getResult: function(name) {
        return this.findWhere({name: name});
    },

    setActive: function(name) {
        this.invoke('set', 'active', false);
        this.getResult(name).set('active', true);
        this.trigger('change:active');
    },

    getActive: function() {
        return this.findWhere({active: true});
    },

    makeFirstActive: function() {
        this.setActive(this.at(0).get('name'));
    }
});

var ProjectModel = Backbone.Model.extend({
    urlRoot: '/api/modeling/projects/',

    defaults: {
        name: '',
        created_at: null,               // Date
        area_of_interest: null,         // GeoJSON
        area_of_interest_name: null,    // Human readable string for AOI.
        model_package: TR55_PACKAGE,    // Package name
        scenarios: null,                // ScenariosCollection
        user_id: 0,                     // User that created the project
        is_activity: false,             // Project that persists across routes
        needs_reset: false,             // Should we overwrite project data on next save?
        allow_save: true                // Is allowed to save to the server - false in compare mode
    },

    initialize: function() {
        var scenarios = this.get('scenarios');
        if (scenarios === null || typeof scenarios === 'string') {
            this.set('scenarios', new ScenariosCollection());
        }

        this.set('user_id', App.user.get('id'));

        // If activity mode is enabled make sure to initialize the project as
        // an activity.
        this.set('is_activity', settings.get('activityMode'));

        this.listenTo(this.get('scenarios'), 'add', this.addIdsToScenarios, this);
    },

    setProjectModel: function(modelPackage) {
        this.set('model_package', modelPackage);
    },

    createTaskModel: function() {
        return createTaskModel(this.get('model_package'));
    },

    createTaskResultCollection: function() {
        return createTaskResultCollection(this.get('model_package'));
    },

    fetchResultsIfNeeded: function() {
        this.get('scenarios').forEach(function(scenario) {
            scenario.fetchResultsIfNeeded();
        });

        this.get('scenarios').on('add', function(scenario) {
            scenario.fetchResultsIfNeeded();
        });
    },

    updateName: function(newName) {
        // TODO: Having fetched a users list of projects,
        // ensure that this new name is unique prior to saving
        this.set('name', newName);
    },

    // Flag to prevent double POSTing of a project.
    saveCalled: false,

    saveProjectListing: function() {
        var listingAttrs = [
                'id', 'name', 'area_of_interest_name', 'is_private',
                'model_package', 'created_at', 'modified_at', 'user'
            ],
            attrs = _.pick(this.toJSON(), listingAttrs);

        // Server expects user to be id, not object
        if (attrs.user.id) {
            attrs.user = attrs.user.id;
        }

        this.save(attrs, { patch: true });
    },

    saveProjectAndScenarios: function() {
        if (!this.get('allow_save') || !App.user.loggedInUserMatch(this.get('user_id'))) {
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
                    scenarioModel.set('taskModel', createTaskModel(response.model_package));
                    scenarioModel.set('results', createTaskResultCollection(response.model_package));
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
    },

    getCompareUrl: function() {
        // Return a url fragment that can access the compare view.
        var root = '/project/',
            id = this.get('id'),
            url = root + 'compare';

        if (id) {
            url = root + id + '/compare';
        }

        return url;
    }
});

var ProjectCollection = Backbone.Collection.extend({
    url: '/api/modeling/projects/',

    model: ProjectModel
});

/**
 * A predicate for a filter function used in the _alterModifications.
 * Returns true if piece has a valid shape with non-zero area, and
 * false otherwise.
 */
function validShape(piece) {
    return (piece.shape !== undefined) && (turfArea(piece.shape) > 0.33);
}

/**
 * This function takes a collection of modifications as drawn on
 * screen and returns an array that has the following property: no
 * point on the map is covered by more than one 'BMP' or more than one
 * 'reclassification'.
 */
function _alterModifications(rawModifications) {
    var pieces = [],
        reclass = 'landcover',
        bmp = 'conservation_practice',
        both = 'both',
        n = rawModifications.length,
        n2 = n * n;

    for (var i = 0; i < n; ++i) {
        var rawModification = rawModifications[i],
            newPiece = {
                name: rawModification.get('name'),
                shape: rawModification.get('effectiveShape') || rawModification.get('shape'),
                value: rawModification.get('value'),
                area: 0
            };

        for (var j = 0; (j < pieces.length) && (newPiece.shape !== undefined) && (j < n2); ++j) {
            var oldPiece = pieces[j];

            /* If the new piece and the old piece are both BMPs or
             * both are reclassifications, then simply subtract the
             * shape of the new piece from that of the old piece to
             * enforce the invariant. */
            if (oldPiece.name === newPiece.name) {
                try {
                    oldPiece.shape = turfErase(oldPiece.shape, newPiece.shape);
                } catch(e) {
                    /* This "can only happen" if oldPiece.shape is
                     * undefined (that is, the empty set), but that is
                     * explicitly codified here. */
                    oldPiece.shape = undefined;
                }
            }
            /* If the new piece and the old piece are not both BMPs or
             * not both reclassifications, then there are a number of
             * possible scenarios: the old piece might be a BMP, might
             * be a reclassification, or might represent an area where
             * BMPs and reclassification overlap. */
            else {
                var newOldIntersection;

                try {
                    newOldIntersection = turfIntersect(oldPiece.shape, newPiece.shape);
                } catch(e) {
                    /* Once again, this "can only happen" if
                     * oldPiece.shape is undefined, but make it
                     * explicit. */
                    oldPiece.shape = undefined;
                    newOldIntersection = undefined;
                }

                /* New overlap pieces are born here. */
                if ((newOldIntersection !== undefined) && (turfArea(newOldIntersection) > 0.33)) {
                    var oldPieceShape = oldPiece.shape, // save a copy, need this for later
                        overlapPiece = {
                            name: both,
                            shape: newOldIntersection,
                            value: {}
                        };

                    /* compute overlap piece and add to array */
                    if ((oldPiece.name === both) && (newPiece.name === reclass)) {
                        overlapPiece.value.bmp = oldPiece.value.bmp;
                        overlapPiece.value.reclass = newPiece.value;
                    } else if ((oldPiece.name === both) && (newPiece.name === bmp)) {
                        overlapPiece.value.bmp = newPiece.value;
                        overlapPiece.value.reclass = oldPiece.value.reclass;
                    } else if (oldPiece.name === reclass) {
                        overlapPiece.value.bmp = newPiece.value;
                        overlapPiece.value.reclass = oldPiece.value;
                    } else {
                        overlapPiece.value.bmp = oldPiece.value;
                        overlapPiece.value.reclass = newPiece.value;
                    }

                    overlapPiece.area = turfArea(overlapPiece.shape);
                    pieces.push(overlapPiece);

                    /* remove the overlapping portion from both parents */
                    try {
                        oldPiece.shape = turfErase(oldPiece.shape, newPiece.shape);
                    } catch(e) {
                        /* Once again, should only happen if
                         * oldPiece.shape is already undefined. */
                        oldPiece.shape = undefined;
                    }

                    try {
                        newPiece.shape = turfErase(newPiece.shape, oldPieceShape);
                    } catch(e) {
                        /* This can (should) never happen. */
                    }
                }
            }
        }
        newPiece.area = turfArea(newPiece.shape);
        pieces.push(newPiece);
        pieces = _.filter(pieces, validShape);
    }

    return _.map(pieces, function(piece) { //ensures 'value' is uniform type for each piece
      var p = piece;
      if ( typeof p.value === 'string') {
        var v = {};
        if (p.name === reclass) {
          v.reclass = p.value;
        }
        else if (p.name === bmp) {
          v.bmp = p.value;
        }
        p.value = v;
      }
      return p;
    });
}

var alterModifications = _.memoize(_alterModifications, function(_, hash) {return hash;});

var ModificationModel = coreModels.GeoModel.extend({
    defaults: _.extend({
            name: '',
            type: '',
            effectiveArea: null, // Area after being clip by AoI
            effectiveUnits: null, // Units of effective area
            effectiveShape: null, // GeoJSON after being clip by AoI,
        }, coreModels.GeoModel.prototype.defaults
    ),

    initialize: function() {
        coreModels.GeoModel.prototype.initialize.apply(this, arguments);

        if (this.get('effectiveArea') === null) {
            this.setEffectiveArea();
        }
    },

    setEffectiveArea: function() {
        var aoi = App.map.get('areaOfInterest'),
            shape = this.get('shape');

        if (aoi && shape) {
            this.clipToAoI(aoi, shape);
        } else {
            this.set('effectiveShape', shape);
        }

        this.setDisplayArea('effectiveShape', 'effectiveArea', 'effectiveUnits');
    },

    clipToAoI: function(aoi, shape) {
        var effectiveShape = turfIntersect(shape, aoi);

        // Turf returns undefined if there is no intersection,
        // so we set effectiveShape to an empty geometry.
        if (effectiveShape === undefined) {
            effectiveShape = {"type": "Polygon", "coordinates": []};
        }

        this.set('effectiveShape', effectiveShape);
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
        user_id: 0, // User that created the project
        inputs: null, // ModificationsCollection
        inputmod_hash: null, // MD5 string
        modifications: null, // ModificationsCollection
        modification_hash: null, // MD5 string
        active: false,
        job_id: null,
        results: null, // ResultCollection
        aoi_census: null, // JSON blob
        modification_censuses: null, // JSON blob
        allow_save: true // Is allowed to save to the server - false in compare mode
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
                    value: 0.984252 // equal to 2.5 cm.
                }
            ]
        });

        this.set('inputs', new ModificationsCollection(attrs.inputs));
        this.set('modifications', new ModificationsCollection(attrs.modifications));

        this.updateModificationHash();
        this.updateInputModHash();

        this.on('change:project change:name', this.attemptSave, this);
        this.get('modifications').on('add remove change', this.updateModificationHash, this);

        var debouncedFetchResults = _.debounce(_.bind(this.fetchResults, this), 500);
        this.get('inputs').on('add', debouncedFetchResults);
        this.get('modifications').on('add remove', debouncedFetchResults);

        this.set('taskModel', App.currentProject.createTaskModel());
        this.set('results', App.currentProject.createTaskResultCollection());
    },

    attemptSave: function() {
        if (!this.get('allow_save') || !App.user.loggedInUserMatch(this.get('user_id'))) {
            // Fail fast if the user can't save the project.
            return;
        }

        if (!this.get('project')) {
            // TODO replace this with radio/wreqr or something less problematic than the global.
            App.currentProject.saveProjectAndScenarios();
            return;
        }

        if (this.isNew() && this.saveCalled) {
            return;
        } else if (this.isNew() && !this.saveCalled) {
            // Makeshift locking mechanism to prevent double saves.
            this.saveCalled = true;
        }

        // Save silently so server values don't trigger reload
        this.save(null, { silent: true })
            .fail(function() {
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

    parse: function(response, options) {
        // In case of new scenarios, update with new server fields,
        // but keep the values of existing fields as they are.
        if (this.isNew()) {
            var newServerFields = _.omit(response, _.keys(this.attributes));
            this.set(newServerFields);
        }

        if (options.silent) {
            // Don't reload server values
            return this.attributes;
        }

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

    fetchResultsIfNeeded: function() {
        var inputmod_hash = this.get('inputmod_hash'),
            needsResults = this.get('results').some(function(resultModel) {
                var emptyResults = !resultModel.get('result'),
                    staleResults = inputmod_hash !== resultModel.get('inputmod_hash');

                return emptyResults || staleResults;
            });

        if (needsResults) {
            this.fetchResults();
        }
    },

    setResults: function() {
        var rawServerResults = this.get('taskModel').get('result');

        if (rawServerResults === '' || rawServerResults === null) {
            this.get('results').setNullResults();
        } else {
            var serverResults = JSON.parse(rawServerResults);
            this.get('results').forEach(function(resultModel) {
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

            this.set('aoi_census', serverResults.aoi_census);
            this.set('modification_censuses', {
                modification_hash: serverResults.modification_hash,
                censuses: serverResults.modification_censuses
            });
        }
    },

    // Poll the taskModel for results and reset the results collection when done.
    // If not successful, the results collection is reset to be empty.
    fetchResults: function() {
        this.updateInputModHash();
        this.attemptSave();

        var self = this,
            results = this.get('results'),
            taskModel = this.get('taskModel'),
            nonZeroModifications = this.get('modifications').filter(function(mod) {
                return mod.get('effectiveArea') > 0;
            }),
            taskHelper = {
                postData: {
                    model_input: JSON.stringify({
                        inputs: self.get('inputs').toJSON(),
                        modification_pieces: alterModifications(nonZeroModifications, self.get('modification_hash')),
                        area_of_interest: App.currentProject.get('area_of_interest'),
                        aoi_census: self.get('aoi_census'),
                        modification_censuses: self.get('modification_censuses'),
                        inputmod_hash: self.get('inputmod_hash'),
                        modification_hash: self.get('modification_hash')
                    })
                },

                onStart: function() {
                    results.setPolling(true);
                },

                pollSuccess: function() {
                    self.setResults();
                },

                pollFailure: function() {
                    console.log('Failed to get modeling results.');
                    results.setNullResults();
                },

                pollEnd: function() {
                    results.setPolling(false);
                    self.attemptSave();
                },

                startFailure: function(response) {
                    console.log('Failed to start modeling job.');

                    if (response.responseJSON && response.responseJSON.error) {
                        console.log(response.responseJSON.error);
                    }

                    results.setNullResults();
                    results.setPolling(false);
                }
            };

        return taskModel.start(taskHelper);
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

        if (!first) {
            // Empty collection, fail fast
            return;
        }

        if (!first.get('is_current_conditions')) {
            // First item is not Current Conditions. Find Current Conditions
            // scenario and make it the first.
            var currentConditions = this.findWhere({ 'is_current_conditions': true });

            this.remove(currentConditions);
            this.add(currentConditions, { at: 0 });

            first = currentConditions;
        }

        this.setActiveScenarioByCid(first.cid);
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

    createNewScenario: function(aoi_census) {
        var scenario = new ScenarioModel({
            name: this.makeNewScenarioName('New Scenario'),
            aoi_census: aoi_census
        });

        this.add(scenario);
        this.setActiveScenarioByCid(scenario.cid);
    },

    updateScenarioName: function(model, newName) {
        newName = newName.trim();

        // Bail early if the name actually didn't change.
        if (model.get('name') === newName) {
            return false;
        }

        var match = this.find(function(model) {
            return model.get('name').toLowerCase() === newName.toLowerCase();
        });

        if (match) {
            window.alert("There is another scenario with the same name. " +
                    "Please choose a unique name for this scenario.");

            console.log('This name is already in use.');

            return false;
        } else if (model.get('name') !== newName) {
            return model.set('name', newName);
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
    if (modelPackageName === TR55_PACKAGE) {
        if (options && (options.compareMode ||
                        options.is_current_conditions)) {
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
    } else if (modelPackageName === GWLFE) {
        if (options && (options.compareMode ||
                        options.is_current_conditions)) {
            return new ModelPackageControlsCollection();
        } else {
            return new ModelPackageControlsCollection([
                new ModelPackageControlModel({ name: 'gwlfe_conservation_practice' })
            ]);
        }
    }

    throw 'Model package not supported ' + modelPackageName;
}

function createTaskModel(modelPackage) {
    switch (modelPackage) {
        case TR55_PACKAGE:
            return new Tr55TaskModel();
        case GWLFE:
            return new GwlfeTaskModel();
    }
    throw 'Model package not supported: ' + modelPackage;
}

function createTaskResultCollection(modelPackage) {
    switch (modelPackage) {
        case TR55_PACKAGE:
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
        case GWLFE:
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
    throw 'Model package not supported: ' + modelPackage;
}


module.exports = {
    getControlsForModelPackage: getControlsForModelPackage,
    ResultModel: ResultModel,
    ResultCollection: ResultCollection,
    ModelPackageModel: ModelPackageModel,
    ModelPackageControlsCollection: ModelPackageControlsCollection,
    ModelPackageControlModel: ModelPackageControlModel,
    Tr55TaskModel: Tr55TaskModel,
    GwlfeTaskModel: GwlfeTaskModel,
    TR55_TASK: TR55_TASK,
    TR55_PACKAGE: TR55_PACKAGE,
    GWLFE: GWLFE,
    ProjectModel: ProjectModel,
    ProjectCollection: ProjectCollection,
    ModificationModel: ModificationModel,
    ModificationsCollection: ModificationsCollection,
    ScenarioModel: ScenarioModel,
    ScenariosCollection: ScenariosCollection
};
