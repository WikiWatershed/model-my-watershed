"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    formTmpl = require('./templates/form.html'),
    searchResultTmpl = require('./templates/searchResult.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    windowTmpl = require('./templates/window.html');

var ENTER_KEYCODE = 13;

var DataCatalogWindow = Marionette.LayoutView.extend({
    template: windowTmpl,
    className: 'data-catalog-window',

    ui: {
        introText: '.intro-text',
        tabs: '.output-tabs-wrapper'
    },

    regions: {
        formRegion: '.form-region',
        panelsRegion: '.tab-panels-region',
        contentsRegion: '.tab-contents-region'
    },

    childEvents: {
        'search': 'doSearch',
        'selectCatalog': 'onSelectCatalog'
    },

    collectionEvents: {
        'change:active, change:loading': 'updateMap'
    },

    onShow: function() {
        this.formRegion.show(new FormView({
            model: this.model
        }));
        this.panelsRegion.show(new TabPanelsView({
            collection: this.collection
        }));
        this.contentsRegion.show(new TabContentsView({
            collection: this.collection
        }));
    },

    getActiveCatalog: function() {
        return this.collection.findWhere({ active: true });
    },

    onSelectCatalog: function(childView, catalogId) {
        // Deactiveate previous catalog
        var prevCatalog = this.getActiveCatalog();
        if (prevCatalog && prevCatalog.id !== catalogId) {
            prevCatalog.set('active', false);
        }

        // Activate selected catalog
        var nextCatalog = this.collection.get(catalogId);
        nextCatalog.set('active', true);

        this.doSearch();
    },

    doSearch: function() {
        var catalog = this.getActiveCatalog(),
            query = this.model.get('query'),
            bounds = App.getLeafletMap().getBounds();

        // Disable intro text after first search request
        this.ui.introText.addClass('hide');
        this.ui.tabs.removeClass('hide');

        catalog.search(query, bounds);
    },

    updateMap: function() {
        var catalog = this.getActiveCatalog(),
            geoms = catalog.get('results').pluck('geom');
        App.map.set('dataCatalogResults', geoms);
    }
});

var FormView = Marionette.ItemView.extend({
    template: formTmpl,
    className: 'data-catalog-form',

    ui: {
        searchInput: '.data-catalog-search-input'
    },

    events: {
        'keyup @ui.searchInput': 'onSearchInputChanged'
    },

    onSearchInputChanged: function(e) {
        var query = this.ui.searchInput.val().trim();
        if (e.keyCode === ENTER_KEYCODE) {
            this.triggerMethod('search');
        } else {
            this.model.set('query', query);
        }
    }
});

var TabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: tabPanelTmpl,
    attributes: {
        role: 'presentation'
    },

    events: {
        'click a': 'onTabClicked'
    },

    modelEvents: {
        'change': 'render'
    },

    onTabClicked: function() {
        this.triggerMethod('selectCatalog', this.model.id);
    },

    onRender: function() {
        this.$el.toggleClass('active', this.model.get('active'));
    }
});

var TabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },
    childView: TabPanelView
});

var TabContentView = Marionette.LayoutView.extend({
    className: function() {
        return 'tab-pane' + (this.model.get('active') ? ' active' : '');
    },
    id: function() {
        return this.model.id;
    },
    template: tabContentTmpl,
    attributes: {
        role: 'tabpanel'
    },

    ui: {
        noResults: '.no-results-panel'
    },

    regions: {
        resultRegion: '.result-region'
    },

    modelEvents: {
        'change': 'update'
    },

    onShow: function() {
        this.resultRegion.show(new ResultsView({
            collection: this.model.get('results')
        }));
    },

    update: function() {
        this.ui.noResults.addClass('hide');
        this.resultRegion.$el.addClass('hide');

        // Don't show "no results" while search request is in progress
        var showNoResults = !this.model.get('loading') &&
            this.model.get('resultCount') === 0;

        if (showNoResults) {
            this.ui.noResults.removeClass('hide');
        } else {
            this.resultRegion.$el.removeClass('hide');
        }
    }
});

var TabContentsView = Marionette.CollectionView.extend({
    className: 'tab-content',
    childView: TabContentView
});

var ResultView = Marionette.ItemView.extend({
    template: searchResultTmpl,
    className: 'resource',

    events: {
        'mouseover': 'highlightResult'
    },

    highlightResult: function() {
        App.map.set('dataCatalogActiveResult', this.model.get('geom'));
    }
});

var ResultsView = Marionette.CollectionView.extend({
    childView: ResultView,

    modelEvents: {
        'sync error': 'render'
    }
});

module.exports = {
    DataCatalogWindow: DataCatalogWindow
};
