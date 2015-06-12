"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    controls = require('./controls'),
    coreViews = require('../core/views'),
    filters = require('../filters'),
    resultsWindowTmpl = require('./templates/resultsWindow.html'),
    resultsDetailsTmpl = require('./templates/resultsDetails.html'),
    resultsTabPanelTmpl = require('./templates/resultsTabPanel.html'),
    resultsTabContentTmpl = require('./templates/resultsTabContent.html'),
    router = require('../router').router,
    modelingHeaderTmpl = require('./templates/modelingHeader.html'),
    scenariosBarTmpl = require('./templates/scenariosBar.html'),
    scenarioTabPanelTmpl = require('./templates/scenarioTabPanel.html'),
    scenarioMenuTmpl = require('./templates/scenarioMenu.html'),
    scenarioMenuItemTmpl = require('./templates/scenarioMenuItem.html'),
    projectMenuTmpl = require('./templates/projectMenu.html'),
    scenarioToolbarTabContentTmpl = require('./templates/scenarioToolbarTabContent.html'),
    chart = require('../core/chart.js'),
    barChartTmpl = require('../core/templates/barChart.html');

var ENTER_KEYCODE = 13,
    ESCAPE_KEYCODE = 27;

// The entire modeling header.
var ModelingHeaderView = Marionette.LayoutView.extend({
    model: models.ProjectModel,
    template: modelingHeaderTmpl,

    regions: {
        projectMenuRegion: '#project-menu-region',
        scenariosRegion: '#scenarios-region',
        toolbarRegion: '#toolbar-region'
    },

    initialize: function() {
        // If the user changes, we should refresh all the views because they
        // have user contextual controls.
        this.listenTo(App.user, 'change', this.reRender);
        this.listenTo(App.user, 'change:guest', this.saveAfterLogin);
    },

    reRender: function() {
        this.projectMenuRegion.empty();
        this.projectMenuRegion.show(new ProjectMenuView({
            model: this.model
        }));

        this.scenariosRegion.empty();
        this.scenariosRegion.show(new ScenariosView({
            collection: this.model.get('scenarios')
        }));

        this.toolbarRegion.empty();
        this.toolbarRegion.show(new ToolbarTabContentsView({
            collection: this.model.get('scenarios'),
            model_package: this.model.get('model_package')
        }));
    },

    onShow: function() {
        this.reRender();
    },

    saveAfterLogin: function(user, guest) {
        if (!guest && this.model.isNew()) {
            var user_id = user.get('id');
            this.model.set('user_id', user_id);
            this.model.get('scenarios').each(function(scenario) {
                scenario.set('user_id', user_id);
            });
            this.model.saveProjectAndScenarios();
        }
    }
});

// The drop down containing the project name
// and projects options drop down.
var ProjectMenuView = Marionette.ItemView.extend({
    ui: {
        rename: '#rename-project',
        share: '#share-project',
        remove: '#delete-project',
        print: '#print-project',
        save: '#save-project',
        privacy: '#project-privacy'
    },

    events: {
        'click @ui.rename': 'renameProject',
        'click @ui.remove': 'deleteProject',
        'click @ui.share': 'shareProject',
        'click @ui.print': 'printProject',
        'click @ui.save': 'saveProjectOrLoginUser',
        'click @ui.privacy': 'setProjectPrivacy'
    },

    template: projectMenuTmpl,

    templateHelpers: function() {
        return {
            editable: App.user.userMatch(this.model.get('user_id'))
        };
    },

    modelEvents: {
        'change': 'render'
    },

    renameProject: function() {
        var self = this,
            rename = new coreViews.InputModal({
            model: new Backbone.Model({
                initial: this.model.get('name'),
                title: 'Rename Project',
                fieldLabel: 'Project Name'
            })
        });
        rename.render();
        rename.on('update', function(val) {
            self.model.updateName(val);
        });
    },

    shareProject: function() {
        var share = new coreViews.ShareModal({
                model: new Backbone.Model({
                    text: 'Project',
                    url: window.location.href,
                    guest: App.user.get('guest')
                }),
                app: App
            });

        share.render();

    },

    deleteProject: function() {
        var self = this,
            del = new coreViews.ConfirmModal({
                model: new Backbone.Model({
                    question: 'Are you sure you want to delete this Project?',
                    confirmLabel: 'Delete',
                    cancelLabel: 'Cancel'
                })
            });
        del.render();
        del.on('confirmation', function() {
            // TODO: our version of backbone returns false if model isNew and an
            // xhr otherwise.  Future versions will return just an xhr always at
            // which point this could get consolidated without a conditional.
            var xhr = self.model.destroy({wait: true});
            if (xhr) {
                xhr.done(function() {
                        router.navigate('/', {trigger: true});
                    })
                    .fail(function() {
                        window.alert('Could not delete this project.');
                    });
            } else {
                router.navigate('/', {trigger: true});
            }
        });
    },

    printProject: function() {
        window.print();
    },

    saveProjectOrLoginUser: function() {
        if (App.user.get('guest')) {
            App.getUserOrShowLogin();
        } else {
            this.model.saveProjectAndScenarios();
        }
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
            modal = new coreViews.ConfirmModal({
                model: new Backbone.Model({
                    question: question,
                    confirmLabel: 'Confirm',
                    cancelLabel: 'Cancel'
                })
            });

        modal.render();
        modal.on('confirmation', function() {
            self.model.set('is_private', !self.model.get('is_private'));
            self.model.saveProjectAndScenarios();
        });
    }
});

// The toolbar containing the scenario tabs,
// scenario drop down menu, and the add
// scenario button.
var ScenariosView = Marionette.LayoutView.extend({
    collection: models.ScenariosCollection,
    template: scenariosBarTmpl,

    templateHelpers: function() {
        return {
            // Check the first scenario in the collection as a proxy for the
            // entire collection.
            editable: App.user.userMatch(this.collection.first().get('user_id'))
        };
    },

    ui: {
        addScenario: '#add-scenario',
        tab: '[data-toggle="tab"]'
    },

    events: {
        'click @ui.addScenario': 'addScenario',
        'click @ui.tab': 'onScenarioTabClicked'
    },

    regions: {
        dropDownRegion: '#scenarios-drop-down-region',
        panelsRegion: '#scenarios-tab-panel-region'
    },

    onShow: function() {
        this.panelsRegion.show(new ScenarioTabPanelsView({
            collection: this.collection
        }));

        this.dropDownRegion.show(new ScenarioDropDownMenuView({
            collection: this.collection
        }));
    },

    addScenario: function() {
        this.collection.createNewScenario();
    },

    onScenarioTabClicked: function(e) {
        var $el = $(e.currentTarget),
            cid = $el.data('scenario-cid');

        this.collection.setActiveScenarioByCid(cid);
    }
});

// A scenario tab.
var ScenarioTabPanelView = Marionette.ItemView.extend({
    model: models.ScenarioModel,
    tagName: 'li',
    template: scenarioTabPanelTmpl,
    attributes: {
        role: 'presentation'
    },

    modelEvents: {
        'change': 'render'
    },

    templateHelpers: function() {
        return {
            cid: this.model.cid,
            editable: App.user.userMatch(this.model.get('user_id'))
        };
    },

    onRender: function() {
        this.$el.toggleClass('active', this.model.get('active'));
    },

    ui: {
        share: '[data-action="share"]',
        destroyConfirm: '[data-action="delete"]',
        rename: '[data-action="rename"]',
        print: '[data-action="print"]',
        duplicate: '[data-action="duplicate"]',
        nameField: '.tab-name'
    },

    events: {
        'click @ui.rename': 'renameScenario',
        'click @ui.destroyConfirm': 'destroyConfirm',
        'click @ui.share': 'showShareModal',
        'click @ui.print': function() {
            window.print();
        },
        'click @ui.duplicate': 'duplicateScenario'
    },

    renameScenario: function() {
        var self = this;

        this.ui.nameField.attr('contenteditable', true).focus();

        this.ui.nameField.on('keyup', function(e) {
            // Cancel on escape key.
            if (e.keyCode === ESCAPE_KEYCODE) {
                self.render();
            }
        });

        this.ui.nameField.on('keypress', function(e) {
            var keycode = (e.keyCode ? e.keyCode : e.which);
            if (keycode == ENTER_KEYCODE) {
                // Don't add line returns to the text.
                e.preventDefault();

                if (self.model.get('name') !== $(this).text() && $(this).text() !== '') {
                    self.model.collection.updateScenarioName(self.model, $(this).text());
                } else {
                    self.render();
                }
            }
        });

        this.ui.nameField.on('blur', function(e) {
            self.model.collection.updateScenarioName(self.model, $(this).text());
        });
    },

    destroyConfirm: function() {
        var self = this,
            del = new coreViews.ConfirmModal({
                model: new Backbone.Model({
                    question: 'Are you sure you want to delete this scenario?',
                    confirmLabel: 'Delete',
                    cancelLabel: 'Cancel'
                })
            });

        del.render();
        del.on('confirmation', function() {
            self.triggerMethod('tab:removed', self.model.cid);
            self.model.destroy();
        });
    },

    showShareModal: function() {
        var share = new coreViews.ShareModal({
                model: new Backbone.Model({
                    text: 'Scenario',
                    url: window.location.href,
                    guest: App.user.get('guest')
                }),
                app: App
            });

        share.render();
    },

    duplicateScenario: function() {
        this.model.collection.duplicateScenario(this.model.cid);
    }
});

// The tabs used to select a scenario.
var ScenarioTabPanelsView = Marionette.CollectionView.extend({
    collection: models.ScenariosCollection,
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: ScenarioTabPanelView,

    collectionEvents: {
        'change': 'render'
    },

    childEvents: {
        'tab:removed': function(view, cid) {
            var modelIndex = _.findIndex(this.collection.models, function(model) {
                    return model.cid === cid;
                }),
                newCid = this.collection.models[modelIndex - 1].cid;

            this.collection.setActiveScenarioByCid(newCid);
       }
    }
});

// The menu item for a scenario in the scenario drop down menu.
var ScenarioDropDownMenuItemView = Marionette.ItemView.extend({
    model: models.ScenarioModel,
    tagName: 'li',
    template: scenarioMenuItemTmpl,
    attributes: {
        role: 'presentation'
    },
    templateHelpers: function() {
        return {
            cid: this.model.cid
        };
    },
    modelEvents: {
        'change': 'render'
    }
});

// The menu next to the scenario tabs that is used to select a
// scenario.
var ScenarioDropDownMenuView = Marionette.CompositeView.extend({
    collection: models.ScenariosCollection,
    template: scenarioMenuTmpl,
    childView: ScenarioDropDownMenuItemView,
    childViewContainer: 'ul',

    ui: {
        menuItem: 'ul li a'
    },

    events: {
        'click @ui.menuItem': 'onMenuItemClick'
    },

    onMenuItemClick: function(e) {
        e.preventDefault();

        var $el = $(e.currentTarget),
            cid = $el.data('scenario-cid');

        this.collection.setActiveScenarioByCid(cid);
    }
});

// The toolbar that contains the modification and input tools
// for a scenario.
var ToolbarTabContentView = Marionette.CompositeView.extend({
    model: models.ScenarioModel,
    template: scenarioToolbarTabContentTmpl,
    collection: models.ModificationsCollection,
    childViewContainer: '.controls',

    tagName: 'div',
    className: 'tab-pane',

    childViewOptions: function(model) {
        var modificationModel = this.getModificationForInputControl(model),
            addModification = _.bind(this.model.addModification, this.model),
            addOrReplaceModification = _.bind(this.model.addOrReplaceModification, this.model);
        return {
            modificationModel: modificationModel,
            addModification: addModification,
            addOrReplaceModification: addOrReplaceModification
        };
    },

    id: function() {
        return this.model.cid;
    },

    attributes: {
        role: 'tabpanel'
    },

    modelEvents: {
        'change:active': 'render'
    },

    ui: {
        deleteModification: '[data-delete]'
    },

    events: {
        'click @ui.deleteModification': 'deleteModification'
    },

    initialize: function() {
        var modificationsColl = this.model.get('modifications');
        this.listenTo(modificationsColl, 'add remove', this.render);
    },

    templateHelpers: function() {
        var modificationsColl = this.model.get('modifications'),
            shapes = modificationsColl.filter(function(model) {
                return model.get('shape') !== null;
            }),
            groupedShapes = _.groupBy(shapes, function(model) {
                return model.get('name');
            });
        return {
            shapes: shapes,
            groupedShapes: groupedShapes
        };
    },

    onRender: function() {
        this.$el.toggleClass('active', this.model.get('active'));
        this.updateMap();
    },

    updateMap: function() {
        if (this.model.get('active')) {
            var modificationsColl = this.model.get('modifications');
            App.getMapView().updateModifications(modificationsColl);
        }
    },

    deleteModification: function(e) {
        var $el = $(e.currentTarget),
            cid = $el.data('delete'),
            modificationsColl = this.model.get('modifications'),
            modification = modificationsColl.get(cid);
        modificationsColl.remove(modification);
    },

    getChildView: function(model) {
        var controlName = model.get('name');
        return controls.getControlView(controlName);
    },

    getModificationForInputControl: function(model) {
        var modificationsColl = this.model.get('modifications'),
            controlName = model.get('name');
        return modificationsColl.findWhere({ name: controlName });
    }
});

// The collection of modification and input toolbars for each
// scenario.
var ToolbarTabContentsView = Marionette.CollectionView.extend({
    collection: models.ScenariosCollection,
    className: 'tab-content',
    childView: ToolbarTabContentView,
    childViewOptions: function(model) {
        var controls = models.getControlsForModelPackage(
            this.options.model_package,
            {is_current_conditions: model.get('is_current_conditions')}
        );
        return {
            collection: controls
        };
    },

    initialize: function(options) {
        this.mergeOptions(options, ['model_package']);
    }
});

// The entire modeling results window
var ModelingResultsWindow = Marionette.LayoutView.extend({
    model: models.ProjectModel,
    id: 'model-output-wrapper',
    tagName: 'div',
    template: resultsWindowTmpl,

    regions: {
        detailsRegion: '#modeling-details-region'
    },

    ui: {
        'toggle': '.tab-content-toggle'
    },

    events: {
        'click @ui.toggle': 'toggleResultsWindow'
    },

    initialize: function() {
        this.listenTo(this.model.get('scenarios'), 'change:active', this.showDetailsRegion);
    },

    onShow: function() {
        this.showDetailsRegion();
    },

    showDetailsRegion: function() {
        var scenario = this.model.get('scenarios').findWhere({ active: true });

        if (scenario) {
            this.detailsRegion.show(new ResultsDetailsView({
                collection: scenario.get('results')
            }));
        }
    },

    transitionInCss: {
        height: '0%'
    },

    animateIn: function() {
        var self = this;

        this.$el.animate({ height: '55%', 'min-height': '300px' }, 200, function() {
            self.trigger('animateIn');
            App.map.set('halfSize', true);
            $(self.ui.toggle.selector).blur()
                .find('i')
                    .removeClass('fa-angle-up')
                    .addClass('fa-angle-down');
        });
    },

    animateOut: function() {
        var self = this;

        // Change map to full size first so there isn't empty space when
        // results window animates out
        App.map.set('halfSize', false);
        this.$el.animate({ height: '0%', 'min-height': '50px' }, 200, function() {
            self.trigger('animateOut');
            $(self.ui.toggle.selector).blur()
                .find('i')
                    .removeClass('fa-angle-down')
                    .addClass('fa-angle-up');
        });
    },

    toggleResultsWindow: function() {
        if (this.$el.css('height') === '50px') {
            this.animateIn();
        } else {
            this.animateOut();
        }
    }
});

// Tab panels and tab contents which contain charts
// and graphs for the modeling results.
var ResultsDetailsView = Marionette.LayoutView.extend({
    template: resultsDetailsTmpl,

    regions: {
        panelsRegion: '.tab-panels-region',
        contentRegion: '.tab-contents-region'
    },

    onShow: function() {
        this.panelsRegion.show(new ResultsTabPanelsView({
            collection: this.collection
        }));

        this.contentRegion.show(new ResultsTabContentsView({
            collection: this.collection
        }));
    }
});

// A model result tab
var ResultsTabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: resultsTabPanelTmpl,
    attributes: {
        role: 'presentation'
    },
    initialize: function() {
        this.listenTo(this.model, 'change:polling', this.render);
    }
});

// Tabs used to cycle through model results
var ResultsTabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },
    events: {
        'shown.bs.tab li a ': 'triggerBarChartRefresh'
    },

    childView: ResultsTabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    },

    triggerBarChartRefresh: function() {
        $('#model-output-wrapper .bar-chart').trigger('bar-chart:refresh');
    }
});

// Model result contents (i.e. charts and graphs)
var ResultsTabContentView = Marionette.LayoutView.extend({
    template: resultsTabContentTmpl,

    tagName: 'div',

    className: 'tab-pane',

    attributes: {
        role: 'tabpanel'
    },

    regions: {
        barChartRegion: '.bar-chart-region'
    },

    id: function() {
        return this.model.get('name');
    },

    onShow: function() {
        this.barChartRegion.show(new BarChartView({
            model: this.model
        }));
    }
});

var BarChartView = Marionette.ItemView.extend({
    template: barChartTmpl,
    id: function() {
        return 'bar-chart-' + this.model.get('name');
    },
    className: 'chart-container',

    initialize: function() {
        this.listenTo(this.model, 'change', this.addChart);
    },

    onAttach: function() {
        this.addChart();
    },

    addChart: function() {
        var selector = '#' + this.id() + ' .bar-chart';
        $(selector).empty();
        var result = this.model.get('result');
        if (result) {
            var indVar = 'type',
                depVars = ['inf', 'runoff', 'et'],
                data = [
                    {
                        type: 'Original',
                        inf: result['unmodified']['inf'],
                        runoff: result['unmodified']['runoff'],
                        et: result['unmodified']['et']
                    },
                    {
                        type: 'Modified',
                        inf: result['modified']['inf'],
                        runoff: result['modified']['runoff'],
                        et: result['modified']['et']
                    }
                ],
                options = {
                    barColors: ['#329b9c', '#4aeab3', '#4ebaea'],
                    depAxisLabel: 'Level',
                    depDisplayNames: ['Infiltration', 'Runoff', 'Evapotranspiration']
                };
            chart.makeBarChart(selector, data, indVar, depVars, options);
        }
    }
});

// Collection of model result tab contents
var ResultsTabContentsView = Marionette.CollectionView.extend({
    tagName: 'div',
    className: 'tab-content',
    childView: ResultsTabContentView,
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

module.exports = {
    ModelingResultsWindow: ModelingResultsWindow,
    ModelingHeaderView: ModelingHeaderView,
    ScenariosView: ScenariosView,
    ScenarioTabPanelsView: ScenarioTabPanelsView,
    ScenarioDropDownMenuView: ScenarioDropDownMenuView,
    ToolbarTabContentView: ToolbarTabContentView,
    ProjectMenuView: ProjectMenuView
};
