"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
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

            App.currProject = project;

            project
                .fetch()
                .done(function() {
                    App.map.set('areaOfInterest', project.get('area_of_interest'));
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
                    project.getResultsIfNeeded();

                    // If this project is an activity then the application's behaior changes.
                    if (project.get('is_activity')) {
                        settings.set('activityMode', true);
                    }
                });
        } else {
            if (App.currProject && settings.get('activityMode')) {
                project = App.currProject;
                // Reset flag is set so clear off old project data.
                if (project.get('needs_reset')) {
                    project.set('user_id', App.user.get('id'));
                    project.set('area_of_interest', App.map.get('areaOfInterest'));
                    project.set('needs_reset', false);

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
                        project.getResultsIfNeeded();
                    });
                } else {
                    initViews(project);
                    project.getResultsIfNeeded();
                    router.navigate(project.getReferenceUrl());
                }
            } else {
                project = new models.ProjectModel({
                    name: 'Untitled Project',
                    created_at: Date.now(),
                    area_of_interest: App.map.get('areaOfInterest'),
                    scenarios: new models.ScenariosCollection()
                });

                // TODO evalutate if we can remove this global by reworking this
                // code.
                App.currProject = project;
                setupNewProjectScenarios(project);
                project.on('change:id', function() {
                    router.navigate(project.getReferenceUrl());
                });

                initScenarioEvents(project);
                initViews(project);

                project.getResultsIfNeeded();
            }
        }
    },

    projectCleanUp: function() {
        App.getMapView().updateModifications(null);
        App.rootView.subHeaderRegion.empty();
        App.rootView.footerRegion.empty();
    },

    // Since we handle redirects after ITSI sign-up within Backbone,
    // but project cloning is done only on server side, we redirect
    // the project cloning route back to the server.
    projectClone: function() {
        window.location.replace(window.location.href);
    }
};

function initScenarioEvents(project) {
    var scenariosColl = project.get('scenarios'),
        mapView = App.getMapView();

    scenariosColl.on('change:activeScenario change:id', function(scenario) {
        mapView.updateModifications(scenario.get('modifications'));
        router.navigate(project.getReferenceUrl());
    });
}

function setupNewProjectScenarios(project) {
    project.get('scenarios').add([
        new models.ScenarioModel({
            name: 'Current Conditions',
            is_current_conditions: true
        }),
        new models.ScenarioModel({
            name: 'New Scenario',
            active: true
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
