"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    settings = require('../core/settings'),
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
                    App.map.set({
                        'areaOfInterest': project.get('area_of_interest'),
                        'areaOfInterestName': project.get('area_of_interest_name')
                    });
                    initScenarioEvents(project);
                    initViews(project);
                    if (scenarioParam) {
                        var scenarioId = parseInt(scenarioParam, 10),
                            scenarios = project.get('scenarios');

                        if (!scenarios.setActiveScenarioById(scenarioId)) {
                            scenarios.makeFirstScenarioActive();
                        }
                    } else {
                        project.get('scenarios').makeFirstScenarioActive();
                    }
                    project.fetchResultsIfNeeded();

                    // If this project is an activity then the application's behavior changes.
                    if (project.get('is_activity')) {
                        settings.set('activityMode', true);
                    }

                    // Send URL to parent if in embed mode
                    updateItsiFromEmbedMode();
                });
        } else {
            if (App.currentProject && settings.get('activityMode')) {
                project = App.currentProject;
                // Reset flag is set so clear off old project data.
                if (project.get('needs_reset')) {
                    project.set({
                        'user_id': App.user.get('id'),
                        'area_of_interest': App.map.get('areaOfInterest'),
                        'area_of_interest_name': App.map.get('areaOfInterestName'),
                        'needs_reset': false
                    });

                    // Clear current scenarios and start over.
                    // Must convert to an array first to avoid conflicts with
                    // collection events that are disassociating the model during
                    // the loop.
                    var locks = [];
                    _.each(project.get('scenarios').toArray(), function(model) {
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
                        project.fetchResultsIfNeeded();
                    });
                } else {
                    initViews(project);
                    project.fetchResultsIfNeeded();
                    updateUrl();
                }
            } else {
                if (!App.currentProject) {
                    // Only make new project if this is the first time
                    // hitting the modeling views.
                    project = new models.ProjectModel({
                        name: 'Untitled Project',
                        created_at: Date.now(),
                        area_of_interest: App.map.get('areaOfInterest'),
                        area_of_interest_name: App.map.get('areaOfInterestName'),
                        scenarios: new models.ScenariosCollection()
                    });

                    App.currentProject = project;
                    setupNewProjectScenarios(project);
                } else {
                    project = App.currentProject;
                    updateUrl();
                }

                project.on('change:id', updateUrl);
                initScenarioEvents(project);
                initViews(project);

                project.fetchResultsIfNeeded();
            }
        }
    },

    projectCleanUp: function() {
        App.currentProject.off('change:id', updateUrl);
        App.currentProject.get('scenarios').off('change:activeScenario change:id', updateScenario);
        App.getMapView().updateModifications(null);
        App.rootView.subHeaderRegion.empty();
        App.rootView.footerRegion.empty();
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
                    'areaOfInterestName': project.get('area_of_interest_name')
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
            })
            .fail(function() {
                App.currentProject = null;
            })
            .always(function() {
                router.navigate('/', { trigger: true });
            });
    }
};

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
    App.getMapView().updateModifications(scenario.get('modifications'));
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
            active: true
        }),
        new models.ScenarioModel({
            name: 'New Scenario'
        })
        // Silent is set to true because we don't actually want to save the
        // project without some user interaction. This initialization
        // should set the stage but we should wait for something else to
        // happen to save. Ideally we will move this into the project
        // creation when we get rid of the global.
    ], { silent: true });
}

function initViews(project) {
    var modelingResultsWindow = new views.ModelingResultsWindow({
            model: project
        }),
        modelingHeader = new views.ModelingHeaderView({
            model: project
        });

    App.rootView.subHeaderRegion.show(modelingHeader);
    App.rootView.footerRegion.show(modelingResultsWindow);
}

module.exports = {
    ModelingController: ModelingController
};
