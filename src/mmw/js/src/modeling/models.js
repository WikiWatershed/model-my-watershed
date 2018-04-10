"use strict";

var $ = require('jquery'),
    Backbone = require('../../shim/backbone'),
    _ = require('lodash'),
    utils = require('../core/utils'),
    settings = require('../core/settings'),
    constants = require('./constants.js'),
    App = require('../app'),
    coreModels = require('../core/models'),
    turfArea = require('turf-area'),
    turfErase = require('turf-erase'),
    turfIntersect = require('turf-intersect'),
    AoiVolumeModel = require('./tr55/models').AoiVolumeModel,
    round = utils.toRoundedLocaleString;

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
            taskName: utils.TR55_TASK,
            taskType: 'mmw/modeling'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

var MapshedTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: utils.MAPSHED,
            taskType: 'mmw/modeling'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

var GwlfeTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: utils.GWLFE,
            taskType: 'mmw/modeling'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

var SubbasinMapshedTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: utils.MAPSHED,
            taskType: 'mmw/modeling'
        },
        coreModels.TaskModel.prototype.defaults
    )
});

var SubbasinGwlfeTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend(
        {
            taskName: utils.GWLFE,
            taskType: 'mmw/modeling'
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
        error: null,
        active: false, // True if currently selected in Compare UI
        activeVar: null // For GWLFE, the currently selected variable in the UI
    },

    isSubbasin: function() {
        // Subbasin is a special case, not displayed as
        // a tab in the UI, but as a secondary GWLFE view
        // rendered on top of the original results
        return this.get('name') === 'subbasin';
    },

    toTR55RunoffCSV: function(isCurrentConditions, aoiVolumeModel) {
        var rows = ['"Runoff Partition","Water Depth (cm)","Water Volume (m3)"'],
            resultKey = isCurrentConditions ? 'unmodified' : 'modified',
            result = this.get('result')['runoff'][resultKey],
            labels = [['runoff', 'Runoff'],
                      ['et'    , 'Evapotranspiration'],
                      ['inf'   , 'Infiltration']];

        return rows.concat(labels.map(function(label) {
            var key = label[0],
                partition = label[1],
                depth = result[key],
                volume = aoiVolumeModel.adjust(depth),
                row = [
                        partition,
                        round(depth, 3),
                        round(volume, 2)
                    ].join('","');

            return '"' + row + '"';
        })).join('\n');
    },

    toTR55WaterQualityCSV: function(isCurrentConditions, aoiVolumeModel) {
        var rows = ['"Quality Measure","Load (kg)","Loading Rate (kg/ha)","Average Concentration (mg/L)"'],
            resultKey = isCurrentConditions ? 'unmodified' : 'modified',
            results = this.get('result')['quality'][resultKey];

        return rows.concat(results.map(function(result) {
            var load = result.load,
                loadingRate = aoiVolumeModel.getLoadingRate(load),
                adjustedRunoff = aoiVolumeModel.adjust(result.runoff),
                concentration = adjustedRunoff ? 1000 * load / adjustedRunoff : 0,
                row = [
                        result.measure,
                        round(load, 3),
                        round(loadingRate, 3),
                        round(concentration, 1)
                    ].join('","');

            return '"' + row + '"';
        })).join('\n');
    },

    toMapShedHydrologyCSV: function() {
        var rows = ['"Month","Precip (cm)","ET (cm)","Surface Runoff (cm)","Subsurface Flow (cm)","Point Src Flow (cm)","Stream Flow (cm)"'],
            runoffVars = [
                    'AvPrecipitation',
                    'AvEvapoTrans',
                    'AvRunoff',
                    'AvGroundWater',
                    'AvPtSrcFlow',
                    'AvStreamFlow',
                ],
            monthNames = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ],
            results = this.get('result')['monthly'];

        // Monthly rows
        rows = rows.concat(results.map(function(result, i) {
            var cols = [monthNames[i]].concat(runoffVars.map(function(runoffVar) {
                    return round(result[runoffVar], 2);
                })).join('","');

            return '"' + cols + '"';
        }));

        // Total row
        var totalCols = ['Total'].concat(runoffVars.map(function(runoffVar) {
                var total = 0;
                for (var i = 0; i < 12; i++) {
                    total += results[i][runoffVar];
                }

                return round(total, 2);
            })).join('","'),
            totals = '"' + totalCols + '"';

        return rows.concat([totals]).join('\n');
    },

    toMapShedWaterQualityLandUseCSV: function() {
        var rows = ['"Sources","Sediment (kg)","Total Nitrogen (kg)","Total Phosphorus (kg)"'],
            results = this.get('result')['Loads'];

        return rows.concat(results.map(function(result) {
            var cols = [
                    result.Source,
                    round(result.Sediment, 1),
                    round(result.TotalN, 1),
                    round(result.TotalP, 1)
                ].join('","');

            return '"' + cols + '"';
        })).join('\n');
    },

    toMapShedWaterQualitySummaryCSV: function() {
        var rows = ['"Sources","Sediment","Total Nitrogen","Total Phosphorus","Mean Flow (m3/year)","Mean Flow (m3/s)"'],
            result = this.get('result');

        return rows.concat(result.SummaryLoads.map(function(sl) {
            var isTotal = sl.Source === "Total Loads",
                meanFlow = isTotal ? round(result.MeanFlow, 0) : '',
                meanFlowPerSecond = isTotal ? round(result.MeanFlowPerSecond, 2) : '',
                cols = [
                        sl.Source + ' (' + sl.Unit + ')',
                        round(sl.Sediment, isTotal ? 1 : 2),
                        round(sl.TotalN, isTotal ? 1 : 2),
                        round(sl.TotalP, isTotal ? 1 : 2),
                        meanFlow,
                        meanFlowPerSecond,
                    ].join('","');

                return '"' + cols + '"';
        })).join('\n');
    },
});

var ResultCollection = Backbone.Collection.extend({
    model: ResultModel,

    setPolling: function(polling, isSubbasinMode) {
        this.getFilteredResults(isSubbasinMode).forEach(function(resultModel) {
            resultModel.set('polling', polling);
        });
    },

    setError: function(error, isSubbasinMode) {
        this.getFilteredResults(isSubbasinMode).forEach(function(resultModel) {
            resultModel.set('error', error);
        });
    },

    setNullResults: function(isSubbasinMode) {
        this.getFilteredResults(isSubbasinMode).forEach(function(resultModel) {
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
    },

    // Filter subbasin option out of modeling tabs
    getFilteredResults: function(isSubbasinMode) {
        return new ResultCollection(
            this.filter(function(result) {
                return isSubbasinMode ? result.isSubbasin() : !result.isSubbasin();
            })
        );
    },
});

var ProjectModel = Backbone.Model.extend({
    urlRoot: '/mmw/modeling/projects/',

    defaults: {
        name: '',
        created_at: null,                  // Date
        area_of_interest: null,            // GeoJSON
        area_of_interest_name: null,       // Human readable string for AOI.
        wkaoi: null,                       // Well Known Area of Interest ID "{code}__{id}"
        model_package: utils.TR55_PACKAGE, // Package name
        scenarios: null,                   // ScenariosCollection
        user_id: 0,                        // User that created the project
        is_activity: false,                // Project that persists across routes
        gis_data: null,                    // Additionally gathered data, such as MapShed for GWLF-E
        mapshed_job_uuid: null,            // (GWLF-E) The id of a successful MapShed job
        subbasin_mapshed_job_uuid: null,   // (GWLF-E) The id of a successful sub-basin MapShed job
        mapshed_job_error: null,           // (GWLF-E) An error on the MapShed job
        subbasin_mapshed_job_error: null,  // (GWLF-E) An error on the sub-basin MapShed job
        needs_reset: false,                // Should we overwrite project data on next save?
        allow_save: true,                  // Is allowed to save to the server - false in compare mode
        sidebar_mode: utils.MODEL,         // The current mode of the sidebar. ANALYZE, MONITOR, or MODEL.
        is_exporting: false,               // Is the project currently exporting?
        hydroshare_errors: [],             // List of errors from connecting to hydroshare
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

        // Debounce HydroShare export to 5 seconds to allow models to run and
        // return without triggering two simultaneous exports
        this.debouncedExportToHydroShare = _.debounce(_.bind(this.exportToHydroShare, this), 5000);
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

    fetchResultsIfNeeded: function(isSubbasinMode) {
        var promises = [];

        this.get('scenarios').forEach(function(scenario) {
            promises.push(scenario.fetchResultsIfNeeded(isSubbasinMode || false));
        });

        this.get('scenarios').on('add', function(scenario) {
            scenario.fetchResultsIfNeeded(isSubbasinMode || false);
        });

        return $.when.apply($, promises);
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
    },

    /**
     * If a project is of the GWLFE package, we trigger the mapshed GIS
     * data gathering chain, and poll for it to finish. Once it finishes,
     * we resolve the lock to indicate the project is ready for further
     * processing.
     * If the project is not of the GWLFE package, we simply resolve the
     * lock immediately and return.
     */
    fetchGisData: function(isSubbasinMode) {
        if (this.get('model_package') === utils.GWLFE) {
            var aoi = this.get('area_of_interest'),
                wkaoi = this.get('wkaoi'),
                promise = $.Deferred(),
                mapshedInput = utils.isWKAoIValid(wkaoi) ?
                                   JSON.stringify({ 'wkaoi': wkaoi }) :
                                   JSON.stringify({ 'area_of_interest': aoi }),
                queryParams = isSubbasinMode ? { subbasin: true } : null,
                taskModel = isSubbasinMode ?
                    createSubbasinTaskModel(utils.MAPSHED) :
                    createTaskModel(utils.MAPSHED),
                taskHelper = {
                    postData: {
                        mapshed_input: mapshedInput
                    },

                    queryParams: queryParams,

                    onStart: function() {
                        console.log(isSubbasinMode ?
                            'Starting polling for SUBBASIN MAPSHED' :
                            'Starting polling for MAPSHED');
                    },

                    startFailure: function(response) {
                        console.log(isSubbasinMode ?
                            'Failed to start gathering data for SUBBASIN MAPSHED.' :
                            'Failed to start gathering data for MAPSHED');

                        if (response.responseJSON && response.responseJSON.error) {
                            console.log(response.responseJSON.error);
                        }

                        promise.reject();
                    },

                    pollSuccess: function() {
                        console.log(isSubbasinMode ?
                            'Polling for SUBBASIN MAPSHED succeeded' :
                            'Polling for MAPSHED succeeded');
                        promise.resolve(taskModel.get('result'), taskModel.get('job'));
                    },

                    pollFailure: function(err) {
                        console.log(isSubbasinMode ?
                            'Failed to gather data required for SUBBASIN MAPSHED' :
                            'Failed to gather data required for MAPSHED');
                        promise.reject(err);
                    }
                };

            taskModel.start(taskHelper);
            return promise;
        } else {
            // Currently there are no methods for fetching GIS Data if the
            // model package is not GWLFE. Thus we return a resolved promise
            // so that any execution waiting on this can continue immediately.
            return $.when();
        }
    },

    /**
     * Returns a promise that completes when GIS Data has been fetched. If fetching
     * is not required, returns an immediatley resolved promise.
     */
    fetchGisDataIfNeeded: function(isSubbasinMode) {
        var self = this,
            saveProjectAndScenarios = _.bind(self.saveProjectAndScenarios, self),
            mapshedJobUUIDAttribute = isSubbasinMode ? 'subbasin_mapshed_job_uuid' : 'mapshed_job_uuid',
            mapshedJobErrorAttribute = isSubbasinMode ? 'subbasin_mapshed_job_error' : 'mapshed_job_error';

        if (self.get(mapshedJobUUIDAttribute) === null && self.fetchGisDataPromise === undefined) {
            self.fetchGisDataPromise = self.fetchGisData(isSubbasinMode);
            self.fetchGisDataPromise
                .done(function(result, job) {
                    if (result) {
                        self.set('gis_data', result);
                        self.set(mapshedJobUUIDAttribute, job);
                        saveProjectAndScenarios();
                    }
                }).fail(function(error) {
                    self.set(mapshedJobErrorAttribute, error);
                }).always(function() {
                    // Clear promise once it completes, so we start a new one
                    // next time.
                    delete self.fetchGisDataPromise;
                });
        }

        // Return fetchGisDataPromise if it exists, else an immediately resolved one.
        return self.fetchGisDataPromise || $.when();
    },

    /**
     * Exports current project to HydroShare. Any key/value pairs provided in
     * payload will also be sent to the server. In most cases this will be
     * the title, abstract, and keywords from the initial modal.
     *
     * Returns a promise of the AJAX call.
     */
    exportToHydroShare: function(payload) {
        var self = this,
            analyzeTasks = App.getAnalyzeCollection(),
            analyzeFiles = analyzeTasks.map(function(at) {
                    return {
                        name: 'analyze_' + at.get('name') + '.csv',
                        contents: at.getResultCSV(),
                    };
                }),
            scenarios = self.get('scenarios'),
            lowerAndHyphenate = function(name) {
                    return name.toLowerCase().replace(/\s/g, '-');
                },
            getTR55ModelFiles = function() {
                    var modelName = 'model_sitestorm_',
                        aoiVolumeModel = new AoiVolumeModel({
                            areaOfInterest: App.map.get('areaOfInterest')
                        }),
                        modelFiles = [];

                    scenarios.forEach(function(s) {
                        var scenarioName = lowerAndHyphenate(s.get('name')),
                            results = s.get('results'),
                            runoffResult = results.findWhere({ name: 'runoff' }),
                            qualityResult = results.findWhere({ name: 'quality' }),
                            isCurrentConditions = s.get('is_current_conditions');

                        if (runoffResult && !runoffResult.get('polling') && runoffResult.get('result')) {
                            modelFiles.push({
                                name: modelName + scenarioName + '_runoff.csv',
                                contents: runoffResult
                                    .toTR55RunoffCSV(isCurrentConditions, aoiVolumeModel),
                            });
                        }

                        if (qualityResult && !qualityResult.get('polling') && qualityResult.get('result')) {
                            modelFiles.push({
                                name: modelName + scenarioName + '_waterquality.csv',
                                contents: qualityResult
                                    .toTR55WaterQualityCSV(isCurrentConditions, aoiVolumeModel),
                            });
                        }
                    });

                    return modelFiles;
                },
            getMapShedModelFiles = function() {
                    var modelName = 'model_multiyear_',
                        modelFiles = [];

                    scenarios.forEach(function(s) {
                        var scenarioName = lowerAndHyphenate(s.get('name')),
                            results = s.get('results'),
                            runoffResult = results.findWhere({ name: 'runoff' }),
                            qualityResult = results.findWhere({ name: 'quality' });

                        if (runoffResult && !runoffResult.get('polling') && runoffResult.get('result')) {
                            modelFiles.push({
                                name: modelName + scenarioName + '_hydrology.csv',
                                contents: runoffResult
                                    .toMapShedHydrologyCSV(),
                            });
                        }

                        if (qualityResult && !qualityResult.get('polling') && qualityResult.get('result')) {
                            modelFiles.push({
                                name: modelName + scenarioName + '_waterquality-landuse.csv',
                                contents: qualityResult
                                    .toMapShedWaterQualityLandUseCSV(),
                            }, {
                                name: modelName + scenarioName + '_waterquality-summary.csv',
                                contents: qualityResult
                                    .toMapShedWaterQualitySummaryCSV(),
                            });
                        }
                    });

                    return modelFiles;
                },
            isTR55 = self.get('model_package') === utils.TR55_PACKAGE,
            modelFiles = isTR55 ? getTR55ModelFiles() : getMapShedModelFiles(),
            getMapshedData = function(scenario) {
                    var gisData = scenario.getGisData(),
                        scenarioName = lowerAndHyphenate(scenario.get('name'));

                    if (!gisData) {
                        return null;
                    }

                    return {
                        name: 'model_multiyear_' + scenarioName + '.gms',
                        data: gisData.model_input
                    };
                },
            mapshedData = isTR55 ? [] : scenarios.map(getMapshedData);

        self.set('is_exporting', true);

        return $.ajax({
            type: 'POST',
            url: '/export/hydroshare?project=' + self.id,
            contentType: 'application/json',
            data: JSON.stringify(_.defaults({
                files: analyzeFiles.concat(modelFiles),
                mapshed_data: mapshedData,
            }, payload))
        }).done(function(result) {
            self.set({
                hydroshare: result,
                hydroshare_errors: [],
                // Exporting to HydroShare make projects public
                // in apps.export.views.hydroshare. We manually
                // make the switch here rather than fetching it
                // from the server, for efficiency.
                is_private: false,
            });
        }).fail(function(result) {
            if (result.responseJSON && result.responseJSON.errors) {
                self.set('hydroshare_errors', result.responseJSON.errors);
            } else if (result.status === 504) {
                self.set('hydroshare_errors', ['Server Timeout']);
            } else {
                self.set('hydroshare_errors', ['Unknown Server Error']);
            }
        }) .always(function() {
            self.set('is_exporting', false);
        });
    },

    /**
     * Disconnects project from HydroShare and deletes the resource.
     *
     * Returns a promise of the AJAX call.
     */
    disconnectHydroShare: function() {
        var self = this,
            hydroshare = self.get('hydroshare');

        self.set({
            is_exporting: true,
            hydroshare: null,
        });

        return $.ajax({
            url: '/export/hydroshare?project=' + self.id,
            type: 'DELETE',
        }).done(function() {
            self.set('hydroshare_errors', []);
        }) .fail(function() {
            // Restore local state in case deletion fails
            self.set('hydroshare', hydroshare);
        }).always(function() {
            self.set('is_exporting', false);
        });
    },

    /**
     * Sets HydroShare Autosync to given value.
     *
     * Returns a promise of the AJAX call.
     */
    setHydroShareAutosync: function(autosync) {
        var self = this,
            hydroshare = self.get('hydroshare');

        self.set({
            is_exporting: true,
            hydroshare: _.defaults({
                autosync: autosync
            }, hydroshare),
        });

        return $.ajax({
            url: '/export/hydroshare?project=' + self.id,
            type: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({
                autosync: autosync
            })
        }).done(function () {
            self.set('hydroshare_errors', []);
        }) .fail(function(result) {
            // Restore local state in case update fails
            self.set('hydroshare', hydroshare);
            self.set('hydroshare_errors', result.responseJSON.errors);
        }).always(function() {
            self.set('is_exporting', false);
        });
    }
});

var ProjectCollection = Backbone.Collection.extend({
    url: '/mmw/modeling/projects/',

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

var GwlfeModificationModel = Backbone.Model.extend({
    defaults: {
        modKey: null,
        output: null,
        userInput: null
    }
});

var ScenarioModel = Backbone.Model.extend({
    urlRoot: '/mmw/modeling/scenarios/',

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
        poll_error: null,
        results: null, // ResultCollection
        aoi_census: null, // JSON blob
        modification_censuses: null, // JSON blob
        allow_save: true, // Is allowed to save to the server - false in compare mode
        options_menu_is_open: false // The sub-dropdown options menu for this scenario is open
    },

    initialize: function(attrs) {
        Backbone.Model.prototype.initialize.apply(this, arguments);
        this.set('user_id', App.user.get('id'));

        var defaultMods = {};
        if (App.currentProject.get('model_package') === utils.TR55_PACKAGE)  {
            defaultMods = {
               inputs: [
                   {
                       name: 'precipitation',
                       value: 0.984252 // equal to 2.5 cm.
                   }
               ]
           };
        }
        _.defaults(attrs, defaultMods);

        this.set('inputs', new ModificationsCollection(attrs.inputs));

        var modifications =
            App.currentProject.get('model_package') === utils.TR55_PACKAGE ?
            new ModificationsCollection(attrs.modifications) :
            new Backbone.Collection(attrs.modifications);

        this.set('modifications', modifications);

        this.updateModificationHash();
        this.updateInputModHash();

        this.on('change:project change:name', this.attemptSave, this);
        this.get('modifications').on('add remove change', this.updateModificationHash, this);
        this.debouncedFetchResults = _.debounce(_.bind(this.fetchResults, this), 500);
        this.get('inputs').on('add', _.bind(this.fetchResultsAfterInitial, this));
        this.get('modifications').on('add remove', _.bind(this.fetchResultsAfterInitial, this));

        this.set('taskModel', App.currentProject.createTaskModel());
        this.set('results', attrs.results ?
            new ResultCollection(attrs.results) :
            App.currentProject.createTaskResultCollection());
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
            .done(function() {
                // Export to HydroShare if available
                var hydroshare = App.currentProject.get('hydroshare');

                if (hydroshare && hydroshare.autosync) {
                    App.currentProject.debouncedExportToHydroShare();
                }
            })
            .fail(function() {
                console.log('Failed to save scenario');
            });
    },

    addModification: function(modification) {
        var modifications = this.get('modifications'),
            modelPackage = App.currentProject.get('model_package'),
            modKeyName = modelPackage === utils.GWLFE ? 'modKey' : 'value';

        window.ga('send', 'event', constants.GA.MODEL_CATEGORY,
           modelPackage + constants.GA.MODEL_MOD_EVENT, modification.get(modKeyName));

        // For GWLFE, first remove existing mod with the same key since it
        // doesn't make sense to have multiples of the same type of BMP.
        if (modelPackage === utils.GWLFE) {
            var modKey = modification.get('modKey'),
                matches = modifications.where({'modKey': modKey});

            if (matches) {
                modifications.remove(matches[0], {silent: true});
            }
        }

        modifications.add(modification);
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

    fetchResultsIfNeeded: function(isSubbasinMode) {
        var self = this,
            inputmod_hash = this.get('inputmod_hash'),
            needsResults = this.get('results').some(function(resultModel) {
                var results = resultModel.get('result'),
                    isSubbasinModel = resultModel.isSubbasin(),
                    shouldIncludeModel = isSubbasinMode ? isSubbasinModel : !isSubbasinModel,
                    emptyResults = !results && shouldIncludeModel,
                    staleResults = inputmod_hash !== resultModel.get('inputmod_hash') && shouldIncludeModel;

                return emptyResults || staleResults;
            });

        if (needsResults && self.fetchResultsPromise === undefined) {
            var fetchResults = _.bind(self.fetchResults, self),
                fetchGisDataPromise = App.currentProject.fetchGisDataIfNeeded(isSubbasinMode);

            self.fetchResultsPromise = fetchGisDataPromise.then(function() {
                var promises = fetchResults(isSubbasinMode);
                return $.when(promises.startPromise, promises.pollingPromise);
            });

            self.fetchResultsPromise
                .always(function() {
                    // Clear promise so we start a new one next time
                    delete self.fetchResultsPromise;
                });
        }

        // Return fetchResultsPromise if it exists, else an immediately resovled one.
        return self.fetchResultsPromise || $.when();
    },

    setResults: function(isSubbasinMode) {
        var serverResults = this.get('taskModel').get('result');

        if (_.isEmpty(serverResults)) {
            this.get('results').setNullResults(isSubbasinMode);
        } else {
            var results = this.get('results').getFilteredResults(isSubbasinMode);

            results.forEach(function(resultModel) {
                var resultName = resultModel.get('name');

                if (serverResults) {
                    resultModel.set({
                        'result': serverResults,
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
    fetchResults: function(isSubbasinMode) {
        this.updateInputModHash();
        this.attemptSave();

        var self = this,
            results = this.get('results'),
            taskModel = this.get('taskModel'),
            gisData = this.getGisData(isSubbasinMode),
            queryParams = isSubbasinMode ? { subbasin: true } : null,
            taskHelper = {
                postData: gisData,

                queryParams: queryParams,

                onStart: function() {
                    console.log(isSubbasinMode ?
                        'Starting polling for SUBBASIN modeling results' :
                                'Starting polling for modeling results');
                    results.setPolling(true, isSubbasinMode);
                },

                pollSuccess: function() {
                    console.log(isSubbasinMode ?
                        'Polling for SUBBASIN modeling results succeeded' :
                        'Polling for modeling results succeeded');
                    self.setResults(isSubbasinMode);
                },

                pollFailure: function(error) {
                    console.log(isSubbasinMode ?
                        'Failed to get SUBBASIN modeling results' :
                        'Failed to get modeling results.');
                    results.setError(error, isSubbasinMode);
                    results.setNullResults(isSubbasinMode);
                },

                pollEnd: function() {
                    console.log(isSubbasinMode ?
                        'Completed polling for SUBBASIN modeling results' :
                        'Completed polling for modeling results');
                    results.setPolling(false, isSubbasinMode);
                    self.attemptSave();
                },

                startFailure: function(response) {
                    var error = isSubbasinMode ?
                        'Failed to start SUBBASIN modeling job' :
                        'Failed to start modeling job.';

                    console.log(error);

                    if (response.responseJSON && response.responseJSON.error) {
                        console.log(response.responseJSON.error);
                        error = response.responseJSON.error;
                    }
                    results.setError(error, isSubbasinMode);
                    results.setNullResults(isSubbasinMode);
                    results.setPolling(false, isSubbasinMode);
                }
            };

        return taskModel.start(taskHelper);
    },

    fetchResultsAfterInitial: function() {
        this.fetchResultsIfNeeded().done(this.debouncedFetchResults);
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
    },

    getGisData: function(isSubbasinMode) {
        var self = this,
            project = App.currentProject,
            aoi = project.get('area_of_interest'),
            wkaoi = project.get('wkaoi');

        switch(App.currentProject.get('model_package')) {
            case utils.TR55_PACKAGE:
                var nonZeroModifications = self.get('modifications').filter(function(mod) {
                        return mod.get('effectiveArea') > 0;
                    }),
                    modelInput = {
                        inputs: self.get('inputs').toJSON(),
                        modification_pieces: alterModifications(nonZeroModifications, self.get('modification_hash')),
                        aoi_census: self.get('aoi_census'),
                        modification_censuses: self.get('modification_censuses'),
                        inputmod_hash: self.get('inputmod_hash'),
                        modification_hash: self.get('modification_hash')
                    };

                if (utils.isWKAoIValid(wkaoi)) {
                    modelInput.wkaoi = wkaoi;
                } else {
                    modelInput.area_of_interest = aoi;
                }

                return {
                    model_input: JSON.stringify(modelInput)
                };

            case utils.GWLFE:
                var modifications = self.get('modifications').pluck('output');

                return {
                    inputmod_hash: self.get('inputmod_hash'),
                    modifications: JSON.stringify(modifications),
                    mapshed_job_uuid: isSubbasinMode ?
                        project.get('subbasin_mapshed_job_uuid') :
                        project.get('mapshed_job_uuid'),
                };
        }
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

    createNewScenario: function() {
        var currentConditions = this.findWhere({ 'is_current_conditions': true }),
            modelPackage = currentConditions.get('taskModel').get('taskName'),
            scenario = new ScenarioModel({
                is_current_conditions: false,
                name: this.makeNewScenarioName('New Scenario'),
                aoi_census: currentConditions.get('aoi_census'),
                results: currentConditions.get('results').toJSON(),
                inputmod_hash: currentConditions.get('inputmod_hash'),
                inputs: currentConditions.get('inputs').toJSON(),
            });

        window.ga('send', 'event', constants.GA.MODEL_CATEGORY, constants.GA.MODEL_SCENARIO_EVENT, modelPackage);

        this.add(scenario);
        this.setActiveScenarioByCid(scenario.cid);
    },

    /** Validate the new scenario name
    The value of *this* is the scenario model.
    @param newName the new name string
    @returns If valid, null
             If invalid, a string with the error
    **/
    validateNewScenarioName: function(newName) {
        var trimmedNewName = newName.trim();

        // Bail early if the name actually didn't change.
        if (this.get('name') === trimmedNewName) {
            return null;
        }

        var match = this.collection.find(function(model) {
            return model.get('name').toLowerCase() === trimmedNewName.toLowerCase();
        });

        if (match) {
            return 'This name is already in use';
        }

        return null;
    },

    updateScenarioName: function(model, newName) {
        var trimmedNewName = newName.trim();

        if (model.get('name') !== trimmedNewName) {
            return model.set('name', trimmedNewName);
        }
    },

    duplicateScenario: function(cid) {
        var source = this.get(cid),
            newModel = new ScenarioModel({
                is_current_conditions: false,
                name: this.makeNewScenarioName('Copy of ' + source.get('name')),
                user_id: source.get('user_id'),
                inputs: source.get('inputs').toJSON(),
                inputmod_hash: source.get('inputmod_hash'),
                modifications: source.get('modifications').toJSON(),
                modification_hash: source.get('modification_hash'),
                job_id: source.get('job_id'),
                poll_error: source.get('poll_error'),
                results: source.get('results').toJSON(),
                aoi_census: source.get('aoi_census'),
                modification_censuses: source.get('modification_censuses'),
                allow_save: source.get('allow_save'),
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
    },

    toggleScenarioOptionsMenu: function(model) {
        var prevOpenScenarios = this.closeAllOpenOptionMenus();

        // Open the selected scenario if it was not open already
        var wasModelAlreadyOpen = _.some(prevOpenScenarios, function(scenario) {
            return scenario.cid === model.cid;
        });
        if (!wasModelAlreadyOpen) {
            model.set('options_menu_is_open', true);
        }
    },

    /** Closes all open scenario option menus
        @return an array of all the scenarios that had open menus
    **/
    closeAllOpenOptionMenus: function() {
        var openScenarios = this.where({ options_menu_is_open: true });
        _.forEach(openScenarios, function(scenario) {
            scenario.set('options_menu_is_open', false);
        });
        return openScenarios;
    }
});

function getControlsForModelPackage(modelPackageName, options) {
    if (modelPackageName === utils.TR55_PACKAGE) {
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
    } else if (modelPackageName === utils.GWLFE) {
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
        case utils.TR55_PACKAGE:
            return new Tr55TaskModel();
        case utils.GWLFE:
            return new GwlfeTaskModel();
        case utils.MAPSHED:
            return new MapshedTaskModel();
    }
    throw 'Model package not supported: ' + modelPackage;
}

function createSubbasinTaskModel(modelPackage) {
    switch (modelPackage) {
        case utils.GWLFE:
            return new SubbasinGwlfeTaskModel();
        case utils.MAPSHED:
            return new SubbasinMapshedTaskModel();
        default:
            throw 'Model package not supported with SUBBASIN: ' + modelPackage;
    }
}

function createTaskResultCollection(modelPackage) {
    switch (modelPackage) {
        case utils.TR55_PACKAGE:
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
        case utils.GWLFE:
            return new ResultCollection([
                {
                    name: 'runoff',
                    displayName: 'Hydrology',
                    result: null
                },
                {
                    name: 'quality',
                    displayName: 'Water Quality',
                    result: null
                },
                {
                    name: 'subbasin',
                    result: null
                },
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
    ProjectModel: ProjectModel,
    ProjectCollection: ProjectCollection,
    ModificationModel: ModificationModel,
    GwlfeModificationModel: GwlfeModificationModel,
    ModificationsCollection: ModificationsCollection,
    ScenarioModel: ScenarioModel,
    ScenariosCollection: ScenariosCollection
};
