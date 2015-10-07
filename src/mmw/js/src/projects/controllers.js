"use strict";

var App = require('../app'),
    views = require('./views');

var ProjectsController = {
    projects: function() {
        App.rootView.footerRegion.show(
            new views.ProjectsView()
        );

        App.state.set('current_page_title', 'Projects');
    },

    projectsCleanUp: function() {
        App.rootView.footerRegion.empty();
    }
};

module.exports = {
    ProjectsController: ProjectsController
};
