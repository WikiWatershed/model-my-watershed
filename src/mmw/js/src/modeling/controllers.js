"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
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

    model: function(projectId) {
        var project;

        if (projectId) {
            project = new models.ProjectModel({
                id: projectId
            });

            project
                .fetch()
                .done(function(data) {
                    var scenarios = new models.ScenariosCollection();

                    _.each(data.scenarios, function(scenario) {
                        scenarios.add(new models.ScenarioModel(scenario));
                    });

                    project.set('scenarios', scenarios);
                    project.set('active_scenario_slug', 'current-conditions');

                    initViews(project);
                });
        } else {
            var taskModel = new models.Tr55TaskModel(),
                currentConditions = new models.ScenarioModel({
                    name: 'Current Conditions',
                    is_current_conditions: true
                });

            project = new models.ProjectModel({
                name: 'My Project',
                created_at: Date.now(),
                area_of_interest: App.map.get('areaOfInterest'),
                active_scenario_slug: 'current-conditions',
                model_package: new models.ModelPackageModel({
                    // TODO: For a new project, users will eventually
                    // be able to choose which modeling package
                    // they want to use in their project. For
                    // now, the only option is TR55, so it is
                    // hard-coded here.
                    name: 'TR-55',
                    taskModel: taskModel
                }),
                scenarios: new models.ScenariosCollection([
                    currentConditions
                ])
            });

            initViews(project);
        }
    },

    modelCleanUp: function() {
        App.rootView.subHeaderRegion.empty();
        App.rootView.footerRegion.empty();
    }
};

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
