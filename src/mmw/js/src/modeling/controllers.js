
"use strict";

var App = require('../app'),
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
                });
        } else {
            project = new models.ProjectModel({
                name: 'Untitled Project',
                created_at: Date.now(),
                area_of_interest: App.map.get('areaOfInterest'),
                scenarios: new models.ScenariosCollection()
            });

            // TODO evalutate if we can remove this global by reworking this code.
            App.currProject = project;

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

            project.on('change:id', function() {
                router.navigate(project.getReferenceUrl());
            });

            initScenarioEvents(project);
            initViews(project);

            project.getResultsIfNeeded();
        }
    },

    projectCleanUp: function() {
        App.getMapView().updateModifications(null);
        App.rootView.subHeaderRegion.empty();
        App.rootView.footerRegion.empty();
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
