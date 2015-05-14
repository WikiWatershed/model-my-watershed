"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    windowTmpl = require('./templates/window.ejs'),
    detailsTmpl = require('./templates/details.ejs'),
    tabPanelTmpl = require('./templates/tabPanel.ejs'),
    tabContentTmpl = require('./templates/tabContent.ejs'),
    modelingHeaderTmpl = require('./templates/modelingHeader.ejs'),
    scenariosBarTmpl = require('./templates/scenariosBar.ejs'),
    scenarioTabPanelTmpl = require('./templates/scenarioTabPanel.ejs'),
    scenarioMenuTmpl = require('./templates/scenarioMenu.ejs'),
    scenarioMenuItemTmpl = require('./templates/scenarioMenuItem.ejs'),
    projectMenuTmpl = require('./templates/projectMenu.ejs'),
    currentConditionsToolbarTabContentTmpl = require('./templates/currentConditionsToolbarTabContent.ejs'),
    scenarioToolbarTabContentTmpl = require('./templates/scenarioToolbarTabContent.ejs');

var ModelingResultsWindow = Marionette.LayoutView.extend({
    tagName: 'div',
    id: 'modeling-output-wrapper',
    template: windowTmpl,

    regions: {
        detailsRegion: '#modeling-details-region'
    },

    onShow: function() {
        this.showDetailsRegion();
    },

    showDetailsRegion: function() {
        this.detailsRegion.show(new DetailsView({
            collection: new models.ResultCollection([
                {name: 'runoff',  displayName: 'Runoff'},
                {name: 'quality', displayName: 'Water Quality'}
            ])}));
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

var DetailsView = Marionette.LayoutView.extend({
    template: detailsTmpl,

    regions: {
        panelsRegion: '.tab-panels-region',
        contentRegion: '.tab-contents-region'
    },

    onShow: function() {
        this.panelsRegion.show(new TabPanelsView({
            collection: this.collection
        }));

        this.contentRegion.show(new TabContentsView({
            collection: this.collection
        }));
    }
});

var TabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: tabPanelTmpl,
    attributes: {
        role: 'presentation'
    }
});

var TabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: TabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    }
});

var TabContentView = Marionette.LayoutView.extend({
    tagName: 'div',
    className: 'tab-pane',
    id: function() {
        return this.model.get('name');
    },
    template: tabContentTmpl,
    attributes: {
        role: 'tabpanel'
    }
});

var TabContentsView = Marionette.CollectionView.extend({
    tagName: 'div',
    className: 'tab-content',
    childView: TabContentView,
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

// The entire modeling header.
var ModelingHeaderView = Marionette.LayoutView.extend({
    template: modelingHeaderTmpl,

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
            collection: this.model.get('scenarios'),
            model: this.model.get('modelPackage')
        }));
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
        addScenario: '#add-scenario'
    },

    events: {
        'click @ui.addScenario': 'addScenario'
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
        var scenario = new models.ScenarioModel({
                name: 'New Scenario'
            });

        this.collection.add(scenario);
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
        this.$el.find('li:first').addClass('active');
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
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

module.exports = {
    ModelingResultsWindow: ModelingResultsWindow,
    ModelingHeaderView: ModelingHeaderView
};
