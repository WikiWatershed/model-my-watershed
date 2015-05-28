"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    coreViews = require('../core/views'),
    resultsWindowTmpl = require('./templates/resultsWindow.ejs'),
    resultsDetailsTmpl = require('./templates/resultsDetails.ejs'),
    resultsTabPanelTmpl = require('./templates/resultsTabPanel.ejs'),
    resultsTabContentTmpl = require('./templates/resultsTabContent.ejs'),
    modelingHeaderTmpl = require('./templates/modelingHeader.ejs'),
    scenariosBarTmpl = require('./templates/scenariosBar.ejs'),
    scenarioTabPanelTmpl = require('./templates/scenarioTabPanel.ejs'),
    scenarioMenuTmpl = require('./templates/scenarioMenu.ejs'),
    scenarioMenuItemTmpl = require('./templates/scenarioMenuItem.ejs'),
    projectMenuTmpl = require('./templates/projectMenu.ejs'),
    currentConditionsToolbarTabContentTmpl = require('./templates/currentConditionsToolbarTabContent.ejs'),
    scenarioToolbarTabContentTmpl = require('./templates/scenarioToolbarTabContent.ejs'),
    chart = require('../core/chart.js'),
    barChartTmpl = require('../core/templates/barChart.ejs');

var ENTER_KEYCODE = 13,
    ESCAPE_KEYCODE = 27;

// The entire modeling header.
var ModelingHeaderView = Marionette.LayoutView.extend({
    template: modelingHeaderTmpl,

    childEvents: {
        'set:activeScenario': 'setActiveScenario'
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
            initialScenario: this.model.get('active_scenario_slug'),
            collection: this.model.get('scenarios')
        }));

        this.toolbarRegion.show(new ToolbarTabContentsView({
            initialScenario: this.model.get('active_scenario_slug'),
            collection: this.model.get('scenarios'),
            model: this.model.get('model_package')
        }));
    },

    setActiveScenario: function(childView, scenarioSlug) {
        this.model.set('active_scenario_slug', scenarioSlug);
    }
});

// The drop down containing the project name
// and projects options drop down.
var ProjectMenuView = Marionette.ItemView.extend({
    modelEvents: {
        'change': 'render'
    },

    template: projectMenuTmpl
});

// The toolbar containing the scenario tabs,
// scenario drop down menu, and the add
// scenario button.
var ScenariosView = Marionette.LayoutView.extend({
    template: scenariosBarTmpl,

    ui: {
        addScenario: '#add-scenario',
        tab: '[data-toggle="tab"]'
    },

    events: {
        'click @ui.addScenario': 'addScenario',
        'click @ui.tab': 'setActiveScenario'
    },

    regions: {
        dropDownRegion: '#scenarios-drop-down-region',
        panelsRegion: '#scenarios-tab-panel-region'
    },

    onShow: function() {
        this.panelsRegion.show(new ScenarioTabPanelsView({
            initialScenario: this.options.initialScenario,
            collection: this.collection
        }));

        this.dropDownRegion.show(new ScenarioDropDownMenuView({
            collection: this.collection
        }));
    },

    addScenario: function() {
        var scenario = new models.ScenarioModel({
            name: this.makeNewScenarioName()
        });

        this.collection.add(scenario);
    },

    counter: 0,

    scenarioCounter: function() {
        this.counter++;
        if (this.counter < this.collection.length) {
            this.counter = this.collection.length;
        }
        return this.counter;
    },

    /**
     * Return a new scenario name of the format "New Scenario X" where X is a
     * positive number and that is greater than all previous X.
     */
    makeNewScenarioName: function() {
        // When making new scenarios, we need to make sure we don't
        // accidentally give two the same name. Use a counter but ensure slug
        // name is not in use by looking at all the current names.
        var numbers = _.without(_.map(this.collection.models, function(model) {
            var slug = model.get('slug')
            var regEx = /^new-scenario-(\d)+/g;
            if (slug.match(regEx) !== null && slug.match(regEx).length === 1) {
                return parseInt(model.get('slug').replace(/^new-scenario-/g, ''));
            }
        }), undefined);
        if (!_.isEmpty(numbers)) {
            var max = _.max(numbers) + 1;
            return 'New Scenario ' + max;
        } else {
            return 'New Scenario ' + this.scenarioCounter();
        }
    },

    setActiveScenario: function(e) {
        var scenarioSlug = $(e.currentTarget).data('scenario-slug');

        _.each(this.collection.models, function(model) {
            model.set('active', false);
        }, this);

        _.find(this.collection.models, function(model) {
            return model.get('slug') === scenarioSlug;
        }, this).set('active', true);

        // we are trying to active a different tab so need to switch tabs here.
        this.panelsRegion.$el.find('a[data-scenario-slug=' + scenarioSlug + ']').tab('show');
        this.triggerMethod('set:activeScenario', scenarioSlug);
    }
});

// A scenario tab.
var ScenarioTabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: scenarioTabPanelTmpl,
    attributes: {
        role: 'presentation'
    },

    modelEvents: {
        'change:name': 'updateSlug',
<<<<<<< HEAD
        'change': 'render'
=======
>>>>>>> Create functioning scenario tabs.
    },

    updateSlug: function() {
        this.model.slugifyName();
        this.render();
    },
    ui: {
        share: '.share',
        destroyConfirm: '.delete',
        rename: '.rename',
        print: '.print' 
    },
    events: {
        'click @ui.rename': 'renameScenario',
        'click @ui.destroyConfirm': 'destroyConfirm',
        'click @ui.print': function() {
            window.print();
        },
        'click @ui.share': 'showShareModal'
    },
    renameScenario: function() {
        var self = this,
            $nameField = this.$el.find('.tab-name');

        $nameField.attr('contenteditable', true).focus();

        $nameField.on('keyup', function(e) {
            // Cancel on escape key.
            if (e.keyCode === ESCAPE_KEYCODE) {
                self.render();
            }
        });

        $nameField.on('keypress', function(e) {
            var keycode = (e.keyCode ? e.keyCode : e.which);
            if (keycode == ENTER_KEYCODE) {
                // Don't add line returns to the text.
                e.preventDefault();
                self.triggerMethod('rename:scenario', self.model, $(this).text());
            }
        });

        $nameField.on('blur', function(e) {
           self.triggerMethod('rename:scenario', self.model, $(this).text());
        });
    },

    destroyConfirm: function() {
        var del = new coreViews.DeleteModal({
            objToDelete: this.model,
            model: new Backbone.Model({ deleteLabel: 'scenario' })
        });
        del.render();
        del.$el.modal('show');
    },

    showShareModal: function() {
        var share = new coreViews.ShareModal({
            model: new Backbone.Model({ url: window.location.href })
        });
        share.render();
        share.$el.modal('show');
    }
});

// The tabs used to select a scenario.
var ScenarioTabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: ScenarioTabPanelView,
    childEvents: {
        'rename:scenario': function(view, model, newName) {
            var match = _.find(this.collection.models, function(model) {
                return model.get('name') === newName ||
                       model.get('slug') === model.makeSlug(newName);
            });
            if (match) {
                alert('This name is already in use.');
                return;
            } else if (model.get('name') !== newName) {
                model.set('name', newName);
            }
        }
    },

    onRender: function() {
        if (this.options.initialScenario) {
            var selector = '[data-scenario-slug="' + this.options.initialScenario + '"]';
            this.$el.find(selector).parent().addClass('active');
        } else {
            this.$el.find('li:first').addClass('active');
        }
    }
});

// The menu item for a scenario in the scenario drop down menu.
var ScenarioDropDownMenuItemView = Marionette.ItemView.extend({
    tagName: 'li',
    template: scenarioMenuItemTmpl,
    attributes: {
        'role': 'presentation'
    },
    modelEvents: {
        'change': 'render'
    },
    onDomRefresh: function() {
        if (this.model.get('active')) {
            this.$el.addClass('active');
        } else {
            this.$el.removeClass('active');
        }
    },
    events: {
        'click': function() {
            this.$el.addClass('active');
            this.trigger('dropdown:item:change');
        }
    }
});

// The menu next to the scenario tabs that is used to select a
// scenario.
var ScenarioDropDownMenuView = Marionette.CompositeView.extend({
    template: scenarioMenuTmpl,
    childView: ScenarioDropDownMenuItemView,
    childViewContainer: 'ul'
});

// The toolbar that contains the modification and input tools
// for a scenario.
var ToolbarTabContentView = Marionette.ItemView.extend({
    tagName: 'div',
    className: 'tab-pane',
    attributes: {
        role: 'tabpanel'
    },

    id: function() {
        return this.model.get('slug');
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
    className: 'tab-content',
    childView: ToolbarTabContentView,

    onRender: function() {
        if (this.options.initialScenario) {
            var selector = '#' + this.options.initialScenario;
            this.$el.find(selector).addClass('active');
        } else {
            this.$el.find('li:first').addClass('active');
        }
    }
});

// The entire modeling results window
var ModelingResultsWindow = Marionette.LayoutView.extend({
    id: 'model-output-wrapper',
    tagName: 'div',
    template: resultsWindowTmpl,

    modelEvents: {
        'change:activeScenarioSlug': 'showDetailsRegion'
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
        var activeScenarioSlug = this.model.get('active_scenario_slug'),
            activeScenario = this.model.get('scenarios').findWhere({ slug: activeScenarioSlug });

        this.detailsRegion.show(new ResultsDetailsView({
            collection: new models.ResultCollection([
                { name: 'runoff', displayName: 'Runoff', results: activeScenario.get('name') + ' runoff results' },
                { name: 'quality', displayName: 'Water Quality', results: activeScenario.get('name') + ' water quality results' },
            ])
        }));
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
