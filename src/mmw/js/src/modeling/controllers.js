"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    constants = require('./constants.js'),
    settings = require('../core/settings'),
    utils = require('../core/utils'),
    router = require('../router').router,
    views = require('./views'),
    models = require('./models');

var ModelingController = {
    projectPrepare: function(projectId) {
        if (!projectId && !App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }
    },

    project: function(projectId, scenarioParam) {
        var project;

        if (projectId) {
            project = new models.ProjectModel({
                id: projectId
            });

            App.currentProject = project;

            project
                .fetch()
                .done(function() {
                    var lock = $.Deferred();

                    App.map.set({
                        'areaOfInterest': project.get('area_of_interest'),
                        'areaOfInterestName': project.get('area_of_interest_name'),
                        'wellKnownAreaOfInterest': project.get('wkaoi'),
                    });
                    initScenarioEvents(project);
                    initViews(project, lock);

                    lock.done(function() {
                        if (scenarioParam) {
                            var scenarioId = parseInt(scenarioParam, 10),
                                scenarios = project.get('scenarios');

                            if (!scenarios.setActiveScenarioById(scenarioId)) {
                                scenarios.makeFirstScenarioActive();
                            }
                        } else {
                            project.get('scenarios').makeFirstScenarioActive();
                        }

                        // If this project is an activity then the application's behavior changes.
                        if (project.get('is_activity')) {
                            settings.set('activityMode', true);
                        }

                        // Send URL to parent if in embed mode
                        updateItsiFromEmbedMode();

                        setPageTitle();
                    });
                })
                .fail(function() {
                    // TODO Make handling project load errors more robust

                    console.log("[ERROR] Could not load project.");
                    App.currentProject = null;
                });

            App.state.set('active_page', 'Modeling');
        } else {
            if (App.currentProject && settings.get('activityMode')) {
                project = App.currentProject;
                // Reset flag is set so clear off old project data.
                if (project.get('needs_reset')) {
                    itsiResetProject(project);
                } else {
                    initViews(project);
                    if (!project.get('scenarios_events_initialized')) {
                        initScenarioEvents(project);
                        project.set('scenarios_events_initialized', true);
                    }
                    updateUrl();
                }
            } else {
                var lock = $.Deferred();

                if (!App.currentProject) {

                    project = reinstateProject(App.projectNumber, lock);

                    App.currentProject = project;
                    if (!App.projectNumber) {
                        setupNewProjectScenarios(project);
                    }
                } else {
                    project = App.currentProject;
                    updateUrl();
                    lock.resolve();
                }

                finishProjectSetup(project, lock);
            }
            setPageTitle();
        }

        $('body').addClass('modeling-stage');
    },

    makeNewProject: function(modelPackage) {
        utils.gtm(constants.GA.MODEL_CATEGORY, constants.GA.MODEL_CREATE_EVENT, modelPackage);

        var project;
        if (settings.get('itsi_embed')) {
            project = App.currentProject;
            project.set('model_package', modelPackage);
            itsiResetProject(project);
            setPageTitle();
        } else {
            var lock = $.Deferred();
            project = new models.ProjectModel({
                name: 'Untitled Project',
                created_at: Date.now(),
                area_of_interest: App.map.get('areaOfInterest'),
                area_of_interest_name: App.map.get('areaOfInterestName'),
                wkaoi: App.map.get('wellKnownAreaOfInterest'),
                model_package: modelPackage,
                scenarios: new models.ScenariosCollection(),
                in_drb: utils.isInDrb(App.map.get('areaOfInterest')),
                in_drwi: utils.isInDrwi(App.map.get('areaOfInterest')),
                in_pa: utils.isInPA(App.map.get('areaOfInterest')),
            });

            App.currentProject = project;
            lock.resolve();

            setupNewProjectScenarios(project);
            finishProjectSetup(project, lock);
            updateUrl();
            setPageTitle();
        }

        $('body').addClass('modeling-stage');
    },

    projectCleanUp: function() {
        projectCleanUp();
    },

    projectErrorState: function() {
        projectErrorState();
    },

    makeNewProjectCleanUp: function() {
        projectCleanUp();
    },

    // Since we handle redirects after ITSI sign-up within Backbone,
    // but project cloning is done only on server side, we redirect
    // the project cloning route back to the server.
    projectClone: function() {
        window.location.replace(window.location.href);
    },

    // Load the project's area of interest, and move to Draw view
    projectDraw: function(projectId) {
        var project = new models.ProjectModel({
            id: projectId
        });

        App.currentProject = project;

        project
            .fetch()
            .done(function() {
                App.map.set({
                    'areaOfInterest': project.get('area_of_interest'),
                    'areaOfInterestName': project.get('area_of_interest_name'),
                    'wellKnownAreaOfInterest': project.get('wkaoi'),
                });
                if (project.get('scenarios').isEmpty()) {
                    // No scenarios available. Set the `needs_reset` flag so
                    // that this project is properly initialized by the
                    // modeling controller.
                    project.set('needs_reset', true);
                }

                if (project.get('is_activity')) {
                    settings.set('activityMode', true);
                }

                setPageTitle();
            })
            .fail(function() {
                App.currentProject = null;
            })
            .always(function() {
                router.navigate('/', { trigger: true });
            });
    }
};

function itsiResetProject(project) {
    project.set({
        'user_id': App.user.get('id'),
        'area_of_interest': App.map.get('areaOfInterest'),
        'area_of_interest_name': App.map.get('areaOfInterestName'),
        'wkaoi': App.map.get('wellKnownAreaOfInterest'),
        'needs_reset': false
    });

    // Clear current scenarios and start over.
    // Must convert to an array first to avoid conflicts with
    // collection events that are disassociating the model during
    // the loop.
    var locks = [];
    _.forEach(project.get('scenarios').toArray(), function(model) {
        var $lock = $.Deferred();
        locks.push($lock);
        model.destroy({
            success: function() {
                $lock.resolve();
            }
        });
    });

    // When all models have been deleted...
    $.when.apply($, locks).then(function() {
        setupNewProjectScenarios(project);

        // Don't reinitialize scenario events.
        if (!project.get('scenarios_events_initialized')) {
            initScenarioEvents(project);
            project.set('scenarios_events_initialized', true);
        }

        // Make sure to save the new project id onto scenarios.
        project.addIdsToScenarios();
        // Save to ensure we capture AOI.
        project.save();

        // Now render.
        initViews(project);
        updateUrl();
    });
}

function finishProjectSetup(project, lock) {
    lock.done(function() {
        project.on('change:id', updateUrl);
        initScenarioEvents(project);
        initViews(project);
        if (App.projectNumber) {
            updateUrl();
        }
    });
}

function setPageTitle() {
    var modelPackageName = App.currentProject.get('model_package'),
        modelPackages = settings.get('model_packages'),
        modelPackageDisplayName = _.find(modelPackages, {name: modelPackageName}).display_name;

    App.state.set({
        'active_page': modelPackageDisplayName,
    });
}

function projectCleanUp() {
    if (App.currentProject) {
        var scenarios = App.currentProject.get('scenarios');

        App.currentProject.off('change:id', updateUrl);
        scenarios.off('change:activeScenario change:id', updateScenario);
        App.currentProject.set('scenarios_events_initialized', false);

        // App.projectNumber holds the number of the project that was
        // in use when the user left the `/project` page.  The intent
        // is to allow the same project to be returned-to via the UI
        // arrow buttons (see issue #690).
        App.projectNumber = scenarios.at(0).get('project');
    }

    // Clear any of the current or previous project's active weather stations
    // from the weather stations layer.
    App.getLayerTabCollection().getObservationLayerGroup().clearActiveWeatherStations();

    App.getMapView().updateModifications(null);
    App.getMapView().clearSubbasinHuc12s();
    App.getMapView().clearSubbasinCatchments();
    App.rootView.subHeaderRegion.empty();
    App.rootView.sidebarRegion.empty();
    App.rootView.compareRegion.empty();
    App.hideMapInfo({ empty: true });
    App.clearAnalyzeCollection();
    App.clearDataCatalog();

    $('body').removeClass('modeling-stage');
}

function projectErrorState() {
    if (App.currentProject) {
        var scenarios = App.currentProject.get('scenarios');
        App.currentProject.off('change:id', updateUrl);
        scenarios.off('change:activeScenario change:id', updateScenario);
        App.currentProject.set('scenarios_events_initialized', false);
        App.projectNumber = scenarios.at(0).get('project');
    }

    App.getMapView().updateModifications(null);
}

function updateItsiFromEmbedMode() {
    if (settings.get('itsi_embed')) {
        App.itsi.setLearnerUrl(Backbone.history.getFragment());
    }
}

function updateUrl() {
    // Use replace: true, so that the back button will work as expected.
    router.navigate(App.currentProject.getReferenceUrl(), { replace: true });
    updateItsiFromEmbedMode();
}

function updateScenario(scenario) {
    App.getMapView().updateModifications(scenario);
    updateUrl();
}

function initScenarioEvents(project) {
    project.get('scenarios').on('change:activeScenario change:id', updateScenario);
}

function setupNewProjectScenarios(project) {
    project.get('scenarios').add([
        new models.ScenarioModel({
            name: 'Current Conditions',
            is_current_conditions: true,
            active: true,
        })
        // Silent is set to true because we don't actually want to save the
        // project without some user interaction. This initialization
        // should set the stage but we should wait for something else to
        // happen to save. Ideally we will move this into the project
        // creation when we get rid of the global.
    ], { silent: true });
}

function initViews(project, lock) {
    var resultsView = new views.ResultsView({
            model: project,
            lock: lock
        }),
        modelingHeader = new views.ModelingHeaderView({
            model: project
        });

    App.rootView.subHeaderRegion.show(modelingHeader);
    App.rootView.sidebarRegion.show(resultsView);
}

function reinstateProject(number, lock) {
    var project = new models.ProjectModel({id: App.projectNumber});

    project
        .fetch()
        .done(function() {
            App.map.set({
                'areaOfInterest': project.get('area_of_interest'),
                'areaOfInterestName': project.get('area_of_interest_name'),
                'wellKnownAreaOfInterest': project.get('wkaoi'),
            });
            setPageTitle();
            lock.resolve();
        });

    return project;
}


module.exports = {
    ModelingController: ModelingController
};
