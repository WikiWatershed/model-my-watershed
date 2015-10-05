"use strict";

var Marionette = require('../../shim/backbone.marionette'),
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
