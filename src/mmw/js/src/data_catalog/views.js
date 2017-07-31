"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    moment = require('moment'),
    App = require('../app'),
    modalModels = require('../core/modals/models'),
    modalViews = require('../core/modals/views'),
    settings = require('../core/settings'),
    utils = require('./utils'),
    errorTmpl = require('./templates/error.html'),
    formTmpl = require('./templates/form.html'),
    pagerTmpl = require('./templates/pager.html'),
    searchResultTmpl = require('./templates/searchResult.html'),
    cuahsiSearchResultTmpl = require('./templates/cuahsiSearchResult.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    windowTmpl = require('./templates/window.html');

var ENTER_KEYCODE = 13,
    MAX_AREA_SQKM = 1500,
    MAX_AREA_FORMATTED = MAX_AREA_SQKM.toLocaleString(),
    PAGE_SIZE = settings.get('data_catalog_page_size'),
    CATALOG_RESULT_TEMPLATE = {
        cinergi: searchResultTmpl,
        hydroshare: searchResultTmpl,
        cuahsi: cuahsiSearchResultTmpl,
    };

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
            fromDate = this.model.get('fromDate'),
            toDate = this.model.get('toDate'),
            bounds = L.geoJson(App.map.get('areaOfInterest')).getBounds(),
            area = utils.areaOfBounds(bounds);

        // CUAHSI should not be fetched beyond a certain size
        if (catalog.get('id') === 'cuahsi' && area > MAX_AREA_SQKM) {
            var formattedArea = Math.round(area).toLocaleString(),
                alertView = new modalViews.AlertView({
                model: new modalModels.AlertModel({
                    alertMessage: "The bounding box of the current area of " +
                                  "interest is " + formattedArea + "&nbsp;km², " +
                                  "which is larger than the current maximum " +
                                  "area of " + MAX_AREA_FORMATTED + "&nbsp;km² " +
                                  "supported for WDC.",
                    alertType: modalModels.AlertTypes.error
                })
            });
            alertView.render();

            // Reset results
            catalog.get('results').reset();
            catalog.set({ resultCount: 0 });
            this.updateMap();

            return;
        }

        // Disable intro text after first search request
        this.ui.introText.addClass('hide');
        this.ui.tabs.removeClass('hide');

        catalog.search(query, fromDate, toDate, bounds);
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
        dateInput: '.data-catalog-date-input',
        filterToggle: '.date-filter-toggle',
        searchInput: '.data-catalog-search-input',
        clearable: '.data-catalog-clearable-input a',
    },

    modelEvents: {
        'change:showingFilters change:isValid change:toDate change:fromDate': 'render'
    },

    events: {
        'keyup @ui.searchInput': 'onSearchInputChanged',
        'click @ui.filterToggle': 'onFilterToggle',
        'change @ui.dateInput': 'onDateInputChanged',
        'keyup @ui.dateInput': 'onDateInputKeyup',
        'click @ui.clearable': 'onClearInput',
    },

    onRender: function() {
        $('.data-catalog-date-input').datepicker();
    },

    onClearInput: function(e) {
        var $el = $(e.currentTarget).siblings('input').val('');
        this.updateDateInput($el);
    },

    onSearchInputChanged: function(e) {
        var query = this.ui.searchInput.val().trim();
        if (e.keyCode === ENTER_KEYCODE) {
            this.triggerSearch();
        } else {
            this.model.set('query', query);
        }
    },

    onDateInputKeyup: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            this.triggerSearch();
        }
    },

    onDateInputChanged: function(e) {
        this.updateDateInput($(e.currentTarget));
    },

    onFilterToggle: function() {
        var newVal = !this.model.get('showingFilters');
        this.model.set('showingFilters', newVal);
    },

    updateDateInput: function($dateEl) {
        var isFromDate = $dateEl.hasClass('from-date'),
            attr = isFromDate ? 'fromDate' : 'toDate';

        this.model.set(attr, $dateEl.val());
    },

    triggerSearch: function() {
        if (this.validate()) {
            this.triggerMethod('search');
        }
    },

    validate: function() {
        // Only need to validate if there are two dates.  Ensure that
        // before is earlier than after
        var dateFormat = "MM/DD/YYYY",
            toDate = this.model.get('toDate'),
            fromDate = this.model.get('fromDate'),
            isValid = false;

        if (!toDate || !fromDate) {
            isValid = true;
        } else {
            isValid = moment(fromDate, dateFormat)
                        .isBefore(moment(toDate, dateFormat));
        }

        this.model.set('isValid', isValid);
        return isValid;
    },

    templateHelpers: function() {
        var showingFilters = this.model.get('showingFilters');

        return {
            filterText: showingFilters ? 'Hide Filters' : 'Show Filters',
        };
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

var ErrorView = Marionette.ItemView.extend({
    template: errorTmpl,
    modelEvents: {
        'change:error': 'render',
    },
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
        pagerRegion: '.pager-region',
        resultRegion: '.result-region',
        errorRegion: '.error-region',
    },

    modelEvents: {
        'change': 'update'
    },

    onShow: function() {
        this.resultRegion.show(new ResultsView({
            collection: this.model.get('results'),
            catalog: this.model.id,
        }));

        this.errorRegion.show(new ErrorView({
            model: this.model,
        }));

        // CUAHSI does not support pagination, but others do
        if (this.model.id !== 'cuahsi') {
            this.pagerRegion.show(new PagerView({
                model: this.model,
            }));
        }
    },

    update: function() {
        this.ui.noResults.addClass('hide');
        this.errorRegion.$el.addClass('hide');
        this.resultRegion.$el.addClass('hide');
        this.pagerRegion.$el.addClass('hide');

        var error = this.model.get('error'),
            // Don't show "no results" while search request is in progress
            showNoResults = !this.model.get('loading') &&
                            this.model.get('resultCount') === 0 && !error;

        if (showNoResults) {
            this.ui.noResults.removeClass('hide');
        } else if (error) {
            this.errorRegion.$el.removeClass('hide');
        } else {
            this.resultRegion.$el.removeClass('hide');
            this.pagerRegion.$el.removeClass('hide');
        }
    }
});

var TabContentsView = Marionette.CollectionView.extend({
    className: 'tab-content',
    childView: TabContentView
});

var ResultView = Marionette.ItemView.extend({
    getTemplate: function() {
        return CATALOG_RESULT_TEMPLATE[this.options.catalog];
    },

    className: 'resource',

    events: {
        'mouseover': 'highlightResult',
        'mouseout': 'unHighlightResult',
    },

    highlightResult: function() {
        App.map.set('dataCatalogActiveResult', this.model.get('geom'));
    },

    unHighlightResult: function() {
        App.map.set({ dataCatalogActiveResult: null });
    }
});

var ResultsView = Marionette.CollectionView.extend({
    childView: ResultView,

    childViewOptions: function() {
        return {
            catalog: this.options.catalog,
        };
    },

    modelEvents: {
        'sync error': 'render'
    }
});

var PagerView = Marionette.ItemView.extend({
    template: pagerTmpl,

    ui: {
        previous: '#pager-previous',
        next: '#pager-next',
    },

    events: {
        'click @ui.previous': 'previousPage',
        'click @ui.next': 'nextPage',
    },

    modelEvents: {
        'change:page change:resultCount': 'render',
    },

    templateHelpers: function() {
         var resultCount = this.model.get('resultCount'),
             page = this.model.get('page'),
             lastPage = Math.ceil(resultCount / PAGE_SIZE);

         return {
             has_results: resultCount > 0,
             has_previous: page > 1,
             has_next: page < lastPage,
         };
    },

    previousPage: function() {
        return this.model.previousPage();
    },

    nextPage: function() {
        return this.model.nextPage();
    }
});

module.exports = {
    DataCatalogWindow: DataCatalogWindow
};
