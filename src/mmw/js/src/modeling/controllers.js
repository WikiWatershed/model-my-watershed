
"use strict";

var App = require('../app'),
    router = require('../router').router,
    views = require('./views'),
    models = require('./models');

var ModelingController = {
    modelPrepare: function(projectId) {
        if (!projectId && !App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }
    },

    model: function(projectId, scenarioParam) {
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

            App.currProject = project;

            var currentConditionsScenario = new models.ScenarioModel({
                name: 'Current Conditions',
                is_current_conditions: true,
                active: true
            });
            project.get('scenarios').add(currentConditionsScenario);

            project.on('change:id', function() {
                router.navigate(project.getReferenceUrl());
            });

            initScenarioEvents(project);
            initViews(project);

            project.getResultsIfNeeded();
        }
    },

    modelCleanUp: function() {
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
