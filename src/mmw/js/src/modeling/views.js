"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
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
    scenarioToolbarTabContentTmpl = require('./templates/scenarioToolbarTabContent.ejs');

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
            initialScenario: this.model.get('activeScenarioSlug'),
            collection: this.model.get('scenarios')
        }));

        this.toolbarRegion.show(new ToolbarTabContentsView({
            initialScenario: this.model.get('activeScenarioSlug'),
            collection: this.model.get('scenarios'),
            model: this.model.get('modelPackage')
        }));
    },

    setActiveScenario: function(childView, scenarioSlug) {
        this.model.set('activeScenarioSlug', scenarioSlug);
    }
});

// The drop down containing the project name
// and projects options drop down.
var ProjectMenuView = Marionette.ItemView.extend({
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
                name: 'New Scenario'
            });

        this.collection.add(scenario);
    },

    setActiveScenario: function(e) {
        var scenarioSlug = $(e.target).data('scenario-slug');

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
        'change:name': 'updateSlug'
    },

    updateSlug: function() {
        this.model.slugifyName();
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
        role: 'presentation'
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
        if (this.model.get('currentConditions')) {
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
        var activeScenarioSlug = this.model.get('activeScenarioSlug'),
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

    childView: ResultsTabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
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
