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
        privacy: '.btn-privacy',
        remove: '.btn-delete'
    },

    events: {
        'click @ui.rename': 'renameProject',
        'click @ui.share': 'shareProject',
        'click @ui.privacy': 'setProjectPrivacy',
        'click @ui.remove': 'deleteProject'
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

    setProjectPrivacy: function() {
        var self = this,
            currentSettings = this.model.get('is_private') ? 'private' : 'public',
            newSettings = currentSettings === 'private' ? 'public' : 'private',
            primaryText = 'This project is currently ' + currentSettings + '. ' +
                      'Are you sure you want to make it ' + newSettings + '? ',
            additionalText = currentSettings === 'private' ?
                    'Anyone with the URL will be able to access it.' :
                    'Only you will be able to access it.',
            question = primaryText + additionalText,
            modal = new modalViews.ConfirmView({
                model: new modalModels.ConfirmModel({
                    question: question,
                    confirmLabel: 'Confirm',
                    cancelLabel: 'Cancel'
                })
            });

        modal.render();

        modal.on('confirmation', function() {
            self.model.set('is_private', !self.model.get('is_private'));
            self.model.saveProjectListing();
        });
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
                    window.alert('Could not delete this project.');
                });
        });
    }
});

var ProjectRowsView = Marionette.CollectionView.extend({
    childView: ProjectRowView
});

module.exports = {
    ProjectsView: ProjectsView
};
