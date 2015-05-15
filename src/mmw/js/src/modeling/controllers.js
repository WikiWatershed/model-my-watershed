"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
    router = require('../router').router,
    views = require('./views'),
    models = require('./models');

var ModelingController = {
    modelPrepare: function() {
        if (!App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }
    },

    model: function() {
        // TODO: If you are coming to the page with a
        // project ID in the URL, we need to load an
        // existing  project here.
        // i.e. var project = new models.ProjectModel({
        //  id: XX
        //  }).fetch
        //  .done(init everything else);

        // TODO: For a new project, users will eventually
        // be able to choose which modeling package
        // they want to use in their project. For
        // now, the only option is TR55, so it is
        // hard-coded here.

        // Init models
        var taskModel = new models.Tr55TaskModel(),
            currentConditions = new models.ScenarioModel({
                name: 'Current',
                currentConditions: true
            }),
            scenario1 = new models.ScenarioModel({
                name: 'Scenario 1'
            }),
            scenario2 = new models.ScenarioModel({
                name: 'Flood Scenario'
            }),
            project = new models.ProjectModel({
                name: 'My Project',
                createdAt: Date.now(),
                areaOfInterest: App.map.get('areaOfInterest'),
                activeScenarioSlug: 'scenario-1',
                modelPackage: new models.ModelPackageModel({
                    name: 'TR-55',
                    taskModel: taskModel
                }),
                scenarios: new models.ScenariosCollection([
                    currentConditions,
                    scenario1,
                    scenario2
                ])
            });

        // Init views
        var modelingResultsWindow = new views.ModelingResultsWindow({
                model: project
            }),
            modelingHeader = new views.ModelingHeaderView({
                model: project
            });

        App.rootView.subHeaderRegion.show(modelingHeader);
        App.rootView.footerRegion.show(modelingResultsWindow);
    },

    modelCleanUp: function() {
        App.rootView.subHeaderRegion.empty();
        App.rootView.footerRegion.empty();
    }
};

module.exports = {
    ModelingController: ModelingController
};
