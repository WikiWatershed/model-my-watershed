"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    router = require('../router').router,
    utils = require('../core/utils'),
    models = require('../modeling/models'),
    modalModels = require('../core/modals/models'),
    modalViews = require('../core/modals/views'),
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
    template: rowTmpl,

    ui: {
        rename: '.btn-rename',
        share: '.btn-share',
    },

    events: {
        'click @ui.rename': 'renameProject',
        'click @ui.share': 'shareProject',
    },

    modelEvents: {
        'change': 'render'
    },

    renameProject: function() {
        var self = this,
            rename = new modalViews.InputView({
                model: new modalModels.InputModel({
                    initial: this.model.get('name'),
                    title: 'Rename Project',
                    fieldLabel: 'Project Name'
                })
            });

        rename.render();

        rename.on('update', function(val) {
            self.model.updateName(val);
            self.model.saveProjectListing();
        });
    },

    shareProject: function() {
        var share = new modalViews.ShareView({
                model: new modalModels.ShareModel({
                    text: 'Project',
                    url: window.location.origin + this.model.getReferenceUrl(),
                    guest: App.user.get('guest'),
                    is_private: this.model.get('is_private')
                }),
                app: App,
                project: this.model
            });

        share.render();
    },
});

var ProjectRowsView = Marionette.CollectionView.extend({
    childView: ProjectRowView
});

module.exports = {
    ProjectsView: ProjectsView
};
