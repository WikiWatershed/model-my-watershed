"use strict";

var App = require('../app'),
    views = require('./views'),
    coreUtils= require('../core/utils');

var ProjectsController = {
    projectsPrepare: function() {
        App.rootView.geocodeSearchRegion.empty();
    },

    projects: function() {
        App.rootView.footerRegion.show(
            new views.ProjectsView()
        );

        App.rootView.layerPickerRegion.empty();

        App.state.set('active_page', coreUtils.projectsPageTitle);
    },

    projectsCleanUp: function() {
        App.rootView.footerRegion.empty();
        App.showLayerPicker();
    }
};

module.exports = {
    ProjectsController: ProjectsController
};
