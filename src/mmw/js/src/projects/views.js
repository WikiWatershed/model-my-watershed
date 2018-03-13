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
            'areaOfInterestName': null,
            'wellKnownAreaOfInterest': null,
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
        remove: '.btn-delete',
        open: '.open-project'
    },

    events: {
        'click @ui.rename': 'renameProject',
        'click @ui.share': 'shareProject',
        'click @ui.remove': 'deleteProject',
        'click @ui.open': 'openProject'
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
        var share = new modalViews.MultiShareView({
                model: this.model,
                app: App,
            });

        share.render();
    },

    deleteProject: function() {
        var self = this,
            del = new modalViews.ConfirmView({
                model: new modalModels.ConfirmModel({
                    question: 'Are you sure you want to delete this Project?',
                    confirmLabel: 'Delete',
                    cancelLabel: 'Cancel'
                })
            });

        del.render();

        del.on('confirmation', function() {
            self.model
                .destroy({ wait: true })
                .fail(function() {
                    var alertView = new modalViews.AlertView({
                        model: new modalModels.AlertModel({
                            alertMessage: 'Could not delete this project.',
                            alertType: modalModels.AlertTypes.error
                        })
                    });

                    alertView.render();
                });
        });
    },

    openProject: function() {
        App.clearAnalyzeCollection();
        App.clearDataCatalog();
        App.map.set({
            'areaOfInterest': null,
            'areaOfInterestName': '',
            'wellKnownAreaOfInterest': null,
        });
        router.navigate('/project/' + this.model.id, { trigger: true });
    }
});

var ProjectRowsView = Marionette.CollectionView.extend({
    childView: ProjectRowView
});

module.exports = {
    ProjectsView: ProjectsView
};
