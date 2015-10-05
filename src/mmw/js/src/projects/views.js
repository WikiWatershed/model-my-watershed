"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    utils = require('../core/utils'),
    models = require('../modeling/models'),
    containerTmpl = require('./templates/container.html'),
    rowTmpl = require('./templates/projectRow.html');

var ProjectsView = Marionette.LayoutView.extend({
    template: containerTmpl,

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
