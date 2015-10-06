"use strict";

var App = require('../app'),
    views = require('./views');

var ProjectsController = {
    projects: function() {
        App.rootView.footerRegion.show(
            new views.ProjectsView()
        );

        App.state.set('current_page_title', 'Projects');
    }
};

module.exports = {
    ProjectsController: ProjectsController
};
