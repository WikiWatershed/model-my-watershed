"use strict";

var $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    moment = require('moment'),
    App = require('../app'),
    analyzeViews = require('../analyze/views.js'),
    settings = require('../core/settings'),
    errorTmpl = require('./templates/error.html'),
    formTmpl = require('./templates/form.html'),
    pagerTmpl = require('./templates/pager.html'),
    searchResultTmpl = require('./templates/searchResult.html'),
    cuahsiSearchResultTmpl = require('./templates/cuahsiSearchResult.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    headerTmpl = require('./templates/header.html'),
    windowTmpl = require('./templates/window.html'),
    resultDetailsTmpl = require('./templates/resultDetails.html'),
    resultsWindowTmpl = require('./templates/resultsWindow.html'),
    resultMapPopoverTmpl = require('./templates/resultMapPopover.html');

var ENTER_KEYCODE = 13,
    PAGE_SIZE = settings.get('data_catalog_page_size'),
    CATALOG_RESULT_TEMPLATE = {
        cinergi: searchResultTmpl,
        hydroshare: searchResultTmpl,
        cuahsi: cuahsiSearchResultTmpl,
    };

var HeaderView = Marionette.LayoutView.extend({
    template: headerTmpl,

    templateHelpers: function() {
        return {
            aoiName: App.map.get('areaOfInterestName')
        };
    }
});

var ResultsWindow = Marionette.LayoutView.extend({
    id: 'model-output-wrapper',
    tagName: 'div',
    template: resultsWindowTmpl,

    regions: {
        analyzeRegion: '#analyze-tab-contents',
        dataCatalogRegion: '#data-catalog-tab-contents'
    },

    onShow: function() {
        var analyzeCollection = App.getAnalyzeCollection();

        this.analyzeRegion.show(new analyzeViews.AnalyzeWindow({
            collection: analyzeCollection
        }));

        this.dataCatalogRegion.show(new DataCatalogWindow({
            model: this.model,
            collection: this.collection
        }));
    },

    onRender: function() {
        this.$el.find('.tab-pane:last').addClass('active');
    }
});

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
        contentsRegion: '.tab-contents-region',
        detailsRegion: '.result-details-region'
    },

    childEvents: {
        'search': 'doSearch',
        'selectCatalog': 'onSelectCatalog',
    },

    collectionEvents: {
        'change:active change:loading': 'updateMap',
        'change:detail_result': 'onDetailResultChange'
    },

    onShow: function() {
        this.formRegion.show(new FormView({
            model: this.model
        }));
        this.panelsRegion.show(new TabPanelsView({
            collection: this.collection
        }));
        this.showChildView('contentsRegion', new TabContentsView({
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

    onDetailResultChange: function() {
        var activeCatalog = this.getActiveCatalog(),
            detailResult = activeCatalog.get('detail_result');

        if (!detailResult) {
            this.closeDetails();
            App.map.set('dataCatalogDetailResult', null);
        } else {
            this.detailsRegion.show(new ResultDetailsView({
                model: detailResult,
                activeCatalog: activeCatalog.id
            }));
            App.map.set({
                'dataCatalogResults': null,
                'dataCatalogDetailResult': detailResult
            });
        }
    },

    closeDetails: function() {
        this.detailsRegion.empty();
        this.updateMap();
    },

    doSearch: function() {
        var catalog = this.getActiveCatalog(),
            query = this.model.get('query'),
            fromDate = this.model.get('fromDate'),
            toDate = this.model.get('toDate'),
            aoiGeoJson = App.map.get('areaOfInterest');

        // Disable intro text after first search request
        this.ui.introText.addClass('hide');
        this.ui.tabs.removeClass('hide');

        catalog.searchIfNeeded(query, fromDate, toDate, aoiGeoJson);
    },

    updateMap: function() {
        var catalog = this.getActiveCatalog();

        App.map.set('dataCatalogResults', null);

        if (catalog) {
            App.map.set('dataCatalogResults', catalog.get('results'));
            App.getMapView().bindDataCatalogPopovers(ResultMapPopoverView,
                catalog.id, catalog.get('results'));
        }
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
    className: 'tab-pane',
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
        'change': 'update',
        'change:active': 'toggleActiveClass',
    },

    onShow: function() {
        var model = this.model;

        this.toggleActiveClass();

        this.resultRegion.show(new ResultsView({
            collection: model.get('results'),
            catalog: model.id,
        }));

        this.errorRegion.show(new ErrorView({
            model: model,
        }));

        if (model.get('is_pageable')) {
            this.pagerRegion.show(new PagerView({
                model: model,
            }));
        }

        if (model.get('has_filters')) {
            // TODO Generalize for different types of filters
            if (model.id === 'cuahsi') {
                $('input#gridded').change(function() {
                    model.get('options')
                         .findWhere({ id: 'gridded' })
                         .set({ active: this.checked });
                });
            }
        }
    },

    toggleActiveClass: function() {
        this.$el.toggleClass('active', this.model.get('active'));
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

var StaticResultView = Marionette.ItemView.extend({
    getTemplate: function() {
        return CATALOG_RESULT_TEMPLATE[this.options.catalog];
    },

    modelEvents: {
        'change:active': 'render'
    },

    className: 'resource'
});

var ResultView = StaticResultView.extend({
    events: {
        'mouseover': 'highlightResult',
        'mouseout': 'unHighlightResult',
        'click': 'selectResult'
    },

    selectResult: function() {
        this.model.collection.showDetail(this.model);
    },

    highlightResult: function() {
        App.map.set('dataCatalogActiveResult', this.model);
    },

    unHighlightResult: function() {
        App.map.set('dataCatalogActiveResult', null);
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

var ResultDetailsView = Marionette.ItemView.extend({
    template: resultDetailsTmpl,

    ui: {
        closeDetails: '.close'
    },

    events: {
        'click @ui.closeDetails': 'closeDetails'
    },

    initialize: function(options) {
        this.activeCatalog = options.activeCatalog;
    },

    templateHelpers: function() {
        return {
            activeCatalog: this.activeCatalog
        };
    },

    closeDetails: function() {
        this.model.collection.closeDetail();
    }
});

var ResultMapPopoverView = Marionette.LayoutView.extend({
    template: resultMapPopoverTmpl,

    regions: {
        'resultRegion': '.data-catalog-popover-result-region'
    },

    className: 'data-catalog-resource-popover',

    ui: {
        'detailsButton': '.data-catalog-popover-details-btn'
    },

    events: {
        'click @ui.detailsButton': 'selectResult'
    },

    onRender: function() {
        this.resultRegion.show(new StaticResultView({
            model: this.model,
            catalog: this.options.catalog,
        }));
    },

    selectResult: function() {
        App.getLeafletMap().closePopup();
        this.model.collection.showDetail(this.model);
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
    HeaderView: HeaderView,
    ResultsWindow: ResultsWindow
};
