"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    drawUtils = require('../draw/utils'),
    coreViews = require('../core/views'),
    resultsWindowTmpl = require('./templates/resultsWindow.html'),
    resultsDetailsTmpl = require('./templates/resultsDetails.html'),
    resultsTabPanelTmpl = require('./templates/resultsTabPanel.html'),
    resultsTabContentTmpl = require('./templates/resultsTabContent.html'),
    modelingHeaderTmpl = require('./templates/modelingHeader.html'),
    scenariosBarTmpl = require('./templates/scenariosBar.html'),
    scenarioTabPanelTmpl = require('./templates/scenarioTabPanel.html'),
    scenarioMenuTmpl = require('./templates/scenarioMenu.html'),
    scenarioMenuItemTmpl = require('./templates/scenarioMenuItem.html'),
    projectMenuTmpl = require('./templates/projectMenu.html'),
    currentConditionsToolbarTabContentTmpl = require('./templates/currentConditionsToolbarTabContent.html'),
    scenarioToolbarTabContentTmpl = require('./templates/scenarioToolbarTabContent.html'),
    chart = require('../core/chart.js'),
    barChartTmpl = require('../core/templates/barChart.html');

var ENTER_KEYCODE = 13,
    ESCAPE_KEYCODE = 27;

// The entire modeling header.
var ModelingHeaderView = Marionette.LayoutView.extend({
    model: models.ProjectModel,
    template: modelingHeaderTmpl,

    childEvents: {
        'rename:scenario': function(view, model, newName) {
            this.model.updateScenarioName(model, newName);
        },
        'create:scenario': function() {
            this.model.createNewScenario();
        }
    },

    regions: {
        projectMenuRegion: '#project-menu-region',
        scenariosRegion: '#scenarios-region',
        toolbarRegion: '#toolbar-region'
    },

    onShow: function() {
        this.projectMenuRegion.show(new ProjectMenuView({
            model: this.model
        }));

        this.scenariosRegion.show(new ScenariosView({
            collection: this.model.get('scenarios')
        }));

        this.toolbarRegion.show(new ToolbarTabContentsView({
            collection: this.model.get('scenarios')
        }));
    }
});

// The drop down containing the project name
// and projects options drop down.
var ProjectMenuView = Marionette.ItemView.extend({
    model: models.ProjectModel,
    template: projectMenuTmpl,
    modelEvents: {
        'change': 'render'
    }
});

// The toolbar containing the scenario tabs,
// scenario drop down menu, and the add
// scenario button.
var ScenariosView = Marionette.LayoutView.extend({
    collection: models.ScenariosCollection,
    template: scenariosBarTmpl,

    ui: {
        addScenario: '#add-scenario',
        tab: '[data-toggle="tab"]'
    },

    events: {
        'click @ui.addScenario': 'addScenario',
        'click @ui.tab': 'onScenarioTabClicked'
    },

   childEvents: {
        'rename:scenario': function(view, model, newName) {
            this.triggerMethod('rename:scenario', model, newName);
        }
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
        this.triggerMethod('create:scenario');
    },

    onScenarioTabClicked: function(e) {
        var $el = $(e.currentTarget),
            cid = $el.data('scenario-cid');
        this.collection.setActiveScenario(cid);
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
            cid: this.model.cid
        };
    },

    onRender: function() {
        this.$el.toggleClass('active', this.model.get('active'));
    },

    ui: {
        share: '.share',
        destroyConfirm: '.delete',
        rename: '.rename',
        print: '.print',
        nameField: '.tab-name'
    },
    events: {
        'click @ui.rename': 'renameScenario',
        'click @ui.destroyConfirm': 'destroyConfirm',
        'click @ui.share': 'showShareModal',
        'click @ui.print': function() {
            window.print();
        }
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

                if (self.model.get('name') !== $(this).text()) {
                    self.triggerMethod('rename:scenario', self.model, $(this).text());
                } else {
                    self.render();
                }
            }
        });

        this.ui.nameField.on('blur', function(e) {
           self.triggerMethod('rename:scenario', self.model, $(this).text());
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
        del.$el.modal('show');
        del.on('confirmation', function() {
            self.model.destroy();
        });
    },

    showShareModal: function() {
        if (App.user.get('guest')) {
            alert('Guest cannot share scenarios. Please log in or register.');
            return;
        }
        var share = new coreViews.ShareModal({
            model: new Backbone.Model({ url: window.location.href })
        });
        share.render();
        share.$el.modal('show');
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

    childView: ScenarioTabPanelView
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
        this.collection.setActiveScenario(cid);
    }
});

// The toolbar that contains the modification and input tools
// for a scenario.
var ToolbarTabContentView = Marionette.ItemView.extend({
    model: models.Scenario,
    tagName: 'div',
    className: 'tab-pane',
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
        drawControl: '[data-feature-name]',
        deleteModification: '[data-delete]'
    },

    events: {
        'click @ui.drawControl': 'startDrawing',
        'click @ui.deleteModification': 'deleteModification'
    },

    initialize: function() {
        var modificationsColl = this.model.get('modifications');
        this.listenTo(modificationsColl, 'add remove', this.updateMap);
        this.listenTo(modificationsColl, 'add remove', this.render);
    },

    onRender: function() {
        this.$el.toggleClass('active', this.model.get('active'));
    },

    updateMap: function() {
        var modificationsColl = this.model.get('modifications');
        App.getMapView().updateModifications(modificationsColl);
    },

    startDrawing: function(e) {
        var $el = $(e.currentTarget),
            modificationsColl = this.model.get('modifications'),
            featureName = $el.data('feature-name'),
            featureType = $el.data('feature-type'),
            map = App.getLeafletMap();
        drawUtils.drawPolygon(map).then(function(geojson) {
            modificationsColl.add(new models.ModificationModel({
                name: featureName,
                type: featureType,
                geojson: geojson
            }));
        });
    },

    deleteModification: function(e) {
        var $el = $(e.currentTarget),
            cid = $el.data('delete'),
            modificationsColl = this.model.get('modifications'),
            modification = modificationsColl.get(cid);
        modificationsColl.remove(modification);
    },

    getTemplate: function() {
        if (this.model.get('is_current_conditions')) {
            return currentConditionsToolbarTabContentTmpl;
        } else {
            return scenarioToolbarTabContentTmpl;
        }
    }
});

// The collection of modification and input toolbars for each
// scenario.
var ToolbarTabContentsView = Marionette.CollectionView.extend({
    collection: models.ScenariosCollection,
    className: 'tab-content',
    childView: ToolbarTabContentView
});

// The entire modeling results window
var ModelingResultsWindow = Marionette.LayoutView.extend({
    model: models.ProjectModel,
    id: 'model-output-wrapper',
    tagName: 'div',
    template: resultsWindowTmpl,

    modelEvents: {
        'change:active_scenario_slug': 'showDetailsRegion'
    },

    regions: {
        detailsRegion: '#modeling-details-region'
    },

    onShow: function() {
        this.showDetailsRegion();
    },

    showDetailsRegion: function() {
        // TODO: Pass in model results for the active scenario, along
        // with some info for the tabs.
        // Project.modelPackage.taskModel runs the model
        // Project.modelPackage.taskModel.results will contain the results
        // They should be attached scenario they were run for, or maybe
        // consider modifying the structure so that every scenario has
        // it's own taskModel which can run jobs.
        var scenario = this.model.get('scenarios').findWhere({ active: true });
        if (scenario) {
            this.detailsRegion.show(new ResultsDetailsView({
                collection: new models.ResultCollection([
                    { name: 'runoff', displayName: 'Runoff', results: scenario.get('name') + ' runoff results' },
                    { name: 'quality', displayName: 'Water Quality', results: scenario.get('name') + ' water quality results' },
                ])
            }));
        }
    },

    transitionInCss: {
        height: '0%'
    },

    animateIn: function() {
        var self = this;

        this.$el.animate({ height: '55%' }, 400, function() {
            self.trigger('animateIn');
            App.map.set('halfSize', true);
        });
    },

    animateOut: function() {
        var self = this;

        this.$el.animate({ height: '0%' }, 100, function() {
            self.trigger('animateOut');
            App.map.set('halfSize', false);
        });
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
    tagName: 'div',
    className: 'tab-pane',
    id: function() {
        return this.model.get('name');
    },
    template: resultsTabContentTmpl,
    attributes: {
        role: 'tabpanel'
    },
    regions: {
        barChartRegion: '.bar-chart-region'
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
    onAttach: function() {
        this.addChart();
    },
    addChart: function() {
        //TODO use real model results
        var selector = '#' + this.id() + ' .bar-chart',
            fakeStackedData = [
                {
                    type: 'Original',
                    infiltration: 0.8,
                    runoff: 0.1,
                    evap: 0.1
                },
                {
                    type: 'Modified',
                    infiltration: 0.4,
                    runoff: 0.2,
                    evap: 0.4
                }
            ],
            options = {
                barColors: ['green', 'blue', 'brown'],
                depAxisLabel: 'Level',
                depDisplayNames: ['Infiltration', 'Runoff', 'Evaporation']
            },
            indVar = 'type',
            depVars = ['infiltration', 'runoff', 'evap'];
        chart.makeBarChart(selector, fakeStackedData, indVar, depVars, options);
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
    ModelingHeaderView: ModelingHeaderView
};
