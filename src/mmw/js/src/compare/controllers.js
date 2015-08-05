"use strict";

var App = require('../app'),
    router = require('../router').router,
    views = require('./views'),
    modelingModels = require('../modeling/models.js');

var CompareController = {
    compare: function(projectId) {
        if (App.currProject) {
            showCompareWindow();
        } else if (projectId) {
            App.currProject = new modelingModels.ProjectModel({
                id: projectId
            });
            App.currProject
                .fetch()
                .done(function() {
                    showCompareWindow();
                });
        }
        App.currProject.on('change:id', updateUrl);
        // else -- this case is caught by the backend and raises a 404
    },

    compareCleanUp: function() {
        App.rootView.footerRegion.empty();
        App.currProject.off('change:id', updateUrl);
    }
};

function updateUrl() {
    // Use replace: true, so that the back button will work as expected.
    router.navigate(App.currProject.getCompareUrl(), { replace: true });
}

function showCompareWindow() {
    var compareWindow = new views.CompareWindow({
        model: App.currProject
    });
    App.rootView.footerRegion.show(compareWindow);
}

module.exports = {
    CompareController: CompareController
};
