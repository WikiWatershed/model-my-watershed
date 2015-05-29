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
                    App.map.set('areaOfInterest', project.get('area_of_interest'));
                    initViews(project);
                });
        } else {
            project = new models.ProjectModel({
                name: 'My Project',
                created_at: Date.now(),
                area_of_interest: App.map.get('areaOfInterest'),
                scenarios: new models.ScenariosCollection([
                    new models.ScenarioModel({
                        name: 'Current Conditions',
                        is_current_conditions: true
                    })
                ])
            });

            project.on('change:id', function(model) {
                router.navigate('model/' + model.id);
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
