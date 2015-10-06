"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    router = require('../router').router,
    utils = require('../core/utils'),
    models = require('../modeling/models'),
    containerTmpl = require('./templates/container.html'),
    rowTmpl = require('./templates/projectRow.html');

var ProjectsView = Marionette.LayoutView.extend({
    template: containerTmpl,

    ui: {
        newProject: '.new-project'
    },

    events: {
        'click @ui.newProject': 'newProject'
    },

    regions: {
        rowContainer: '.project-rows-container'
    },

    onShow: function() {
        var self = this,
            projects = new models.ProjectCollection();

        // Sort newest projects to top
        projects.comparator = utils.reverseSortBy(function(project) {
            return project.get('created_at');
        });

        projects
            .fetch()
            .done(function() {
                self.rowContainer.show(new ProjectRowsView({
                    collection: projects
                }));
            });
    },

    newProject: function() {
        App.currentProject = null;
        App.projectNumber = undefined;
        App.map.set({
            'areaOfInterest': null,
            'areaOfInterestName': null
        });

        router.navigate('', { trigger: true });
    }
});

var ProjectRowView = Marionette.ItemView.extend({
    className: 'project row',
    template: rowTmpl
});

var ProjectRowsView = Marionette.CollectionView.extend({
    childView: ProjectRowView
});

module.exports = {
    ProjectsView: ProjectsView
};
