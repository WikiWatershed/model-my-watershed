"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    analyzeViews = require('../analyze/views.js'),
    settings = require('../core/settings'),
    models = require('./models'),
    errorTmpl = require('./templates/error.html'),
    dateFilterTmpl = require('./templates/dateFilter.html'),
    checkboxFilterTmpl = require('./templates/checkboxFilter.html'),
    filterSidebarTmpl = require('./templates/filterSidebar.html'),
    formTmpl = require('./templates/form.html'),
    pagerTmpl = require('./templates/pager.html'),
    searchResultTmpl = require('./templates/searchResult.html'),
    searchResultCuahsiTmpl = require('./templates/searchResultCuahsi.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    headerTmpl = require('./templates/header.html'),
    windowTmpl = require('./templates/window.html'),
    resultDetailsCinergiTmpl = require('./templates/resultDetailsCinergi.html'),
    resultDetailsHydroshareTmpl = require('./templates/resultDetailsHydroshare.html'),
    resultDetailsCuahsiTmpl = require('./templates/resultDetailsCuahsi.html'),
    resultDetailsCuahsiChartTmpl = require('./templates/resultDetailsCuahsiChart.html'),
    resultDetailsCuahsiTableTmpl = require('./templates/resultDetailsCuahsiTable.html'),
    resultDetailsCuahsiTableRowTmpl = require('./templates/resultDetailsCuahsiTableRow.html'),
    resultsWindowTmpl = require('./templates/resultsWindow.html'),
    resultMapPopoverDetailTmpl = require('./templates/resultMapPopoverDetail.html'),
    resultMapPopoverListTmpl = require('./templates/resultMapPopoverList.html'),
    resultMapPopoverListItemTmpl = require('./templates/resultMapPopoverListItem.html'),
    resultMapPopoverControllerTmpl = require('./templates/resultMapPopoverController.html');

var ENTER_KEYCODE = 13,
    PAGE_SIZE = settings.get('data_catalog_page_size'),
    CATALOG_RESULT_TEMPLATE = {
        cinergi: searchResultTmpl,
        hydroshare: searchResultTmpl,
        cuahsi: searchResultCuahsiTmpl,
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
        detailsRegion: '.result-details-region',
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
            model: this.model,
            collection: this.collection
        }));
        this.panelsRegion.show(new TabPanelsView({
            collection: this.collection
        }));
        this.showChildView('contentsRegion', new TabContentsView({
            collection: this.collection
        }));
    },

    onSelectCatalog: function(childView, catalogId) {
        // Deactiveate previous catalog
        var prevCatalog = this.collection.getActiveCatalog();
        if (prevCatalog && prevCatalog.id !== catalogId) {
            prevCatalog.set('active', false);
        }

        // Activate selected catalog
        var nextCatalog = this.collection.get(catalogId);
        nextCatalog.set('active', true);

        this.doSearch();
    },

    onDetailResultChange: function() {
        var activeCatalog = this.collection.getActiveCatalog(),
            ResultDetailsView = CATALOG_RESULT_DETAILS_VIEW[activeCatalog.id],
            detailResult = activeCatalog.get('detail_result');

        if (!detailResult) {
            this.closeDetails();
            App.map.set('dataCatalogDetailResult', null);
        } else {
            this.detailsRegion.show(new ResultDetailsView({
                model: detailResult,
                catalog: activeCatalog.id
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
        var catalog = this.collection.getActiveCatalog(),
            query = this.model.get('query'),
            aoiGeoJson = App.map.get('areaOfInterest');

        // Disable intro text after first search request
        this.ui.introText.addClass('hide');
        this.ui.tabs.removeClass('hide');

        catalog.searchIfNeeded(query, aoiGeoJson);
    },

    updateMap: function() {
        var catalog = this.collection.getActiveCatalog();

        App.map.set('dataCatalogResults', null);

        if (catalog) {
            App.map.set('dataCatalogResults', catalog.get('results'));
            App.getMapView().bindDataCatalogPopovers(
                ResultMapPopoverDetailView, ResultMapPopoverControllerView,
                catalog.id, catalog.get('results'));
        }
    }
});

var FormView = Marionette.ItemView.extend({
    // model: FormModel
    // collection: Catalogs

    template: formTmpl,
    className: 'data-catalog-form',

    ui: {
        filterToggle: '.filter-sidebar-toggle',
        searchInput: '.data-catalog-search-input',
    },

    events: {
        'keyup @ui.searchInput': 'onSearchInputChanged',
        'click @ui.filterToggle': 'onFilterToggle',
    },

    initialize: function() {
        var updateFilterSidebar = _.bind(function() {
            if (App.rootView.secondarySidebarRegion.hasView()) {
                this.showFilterSidebar();
            }

        }, this);

        // Update the filter sidebar when there's a new active catalog
        this.collection.on('change:active', updateFilterSidebar);
    },

    getFilters: function() {
        var activeCatalog = this.collection.getActiveCatalog();

        if (!activeCatalog) {
            return null;
        }

        return activeCatalog.get('filters');
    },

    onSearchInputChanged: function(e) {
        var query = this.ui.searchInput.val().trim();
        if (e.keyCode === ENTER_KEYCODE) {
            this.triggerSearch();
        } else {
            this.model.set('query', query);
        }
    },

    onFilterToggle: function() {
        App.map.toggleSecondarySidebar();
        if (App.rootView.secondarySidebarRegion.hasView()) {
            App.rootView.secondarySidebarRegion.empty();
        } else {
            this.showFilterSidebar();
        }
    },

    showFilterSidebar: function() {
        var filters = this.getFilters();

        if (!filters) {
            return;
        }

        filters.on('change', this.render);

        App.rootView.secondarySidebarRegion.show(new FilterSidebar({
            collection: filters
        }));
    },

    triggerSearch: function() {
        this.triggerMethod('search');
    },

    templateHelpers: function() {
        var filters = this.getFilters();

        if (!filters) {
            return { filterNumText: '' };
        }

        var numActiveFilters = filters.countActive();

        return {
            filterNumText: numActiveFilters > 0 ?
                '(' + numActiveFilters + ')' :
                null
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

    templateHelpers: function() {
        if (this.options.catalog === 'cuahsi') {
            return {
                'concept_keywords': this.model.get('variables')
                                              .pluck('concept_keyword')
                                              .join('; '),
            };
        }
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

var ResultDetailsBaseView = Marionette.LayoutView.extend({
    ui: {
        closeDetails: '.close'
    },

    events: {
        'click @ui.closeDetails': 'closeDetails'
    },

    initialize: function(options) {
        this.catalog = options.catalog;
    },

    onAttach: function() {
        this.$('[data-toggle="popover"]').popover({
            placement: 'right',
            trigger: 'click',
        });
    },

    closeDetails: function() {
        this.model.collection.closeDetail();
    }
});

var ResultDetailsCinergiView = ResultDetailsBaseView.extend({
    template: resultDetailsCinergiTmpl,
});

var ResultDetailsHydroshareView = ResultDetailsBaseView.extend({
    template: resultDetailsHydroshareTmpl,
});

var ResultDetailsCuahsiView = ResultDetailsBaseView.extend({
    template: resultDetailsCuahsiTmpl,

    templateHelpers: function() {
        var id = this.model.get('id'),
            location = id.substring(id.indexOf(':') + 1),
            fetching = this.model.get('fetching'),
            error = this.model.get('error'),
            last_date = this.model.get('end_date');

        if (!fetching && !error) {
            var variables = this.model.get('variables'),
                last_dates = variables.map(function(v) {
                        var values = v.get('values');

                        if (values.length > 0) {
                            return new Date(values.last().get('datetime'));
                        } else {
                            return new Date('01/01/1900');
                        }
                    });

            last_dates.push(new Date(last_date));
            last_date = Math.max.apply(null, last_dates);
        }

        return {
            location: location,
            last_date: last_date,
        };
    },

    regions: {
        valuesRegion: '#cuahsi-values-region',
    },

    ui: _.defaults({
        chartButton: '#cuahsi-button-chart',
        tableButton: '#cuahsi-button-table',
    }, ResultDetailsBaseView.prototype.ui),

    events: _.defaults({
        'click @ui.chartButton': 'setChartMode',
        'click @ui.tableButton': 'setTableMode',
    }, ResultDetailsBaseView.prototype.events),

    modelEvents: {
        'change:fetching': 'render',
        'change:mode': 'showValuesRegion',
    },

    initialize: function() {
        var showValuesRegion = _.bind(this.showValuesRegion, this);

        this.model.getCuahsiValues({
            onEachSearchDone: showValuesRegion,
        });
    },

    onRender: function() {
        this.showValuesRegion();
    },

    showValuesRegion: function() {
        var mode = this.model.get('mode'),
            variables = this.model.get('variables'),
            view = mode === 'table' ?
                   new CuahsiTableView({ collection: variables }) :
                   new CuahsiChartView({ collection: variables });

        this.valuesRegion.show(view);
    },

    setChartMode: function() {
        this.model.set('mode', 'chart');
        this.ui.chartButton.addClass('active');
        this.ui.tableButton.removeClass('active');
    },

    setTableMode: function() {
        this.model.set('mode', 'table');
        this.ui.tableButton.addClass('active');
        this.ui.chartButton.removeClass('active');
    }
});

var CATALOG_RESULT_DETAILS_VIEW = {
    cinergi: ResultDetailsCinergiView,
    hydroshare: ResultDetailsHydroshareView,
    cuahsi: ResultDetailsCuahsiView,
};

var CuahsiTableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: resultDetailsCuahsiTableRowTmpl,
});

var CuahsiTableView = Marionette.CompositeView.extend({
    tagName: 'table',
    className: 'table custom-hover',
    attributes: {
        'data-toggle': 'table',
    },
    template: resultDetailsCuahsiTableTmpl,

    childView: CuahsiTableRowView,
    childViewContainer: 'tbody',

    onAttach: function() {
        this.$('[data-toggle="table"]').bootstrapTable();
        this.$('[data-toggle="popover"]').popover({
            placement: 'right',
            trigger: 'hover',
        });
    }
});

var CuahsiChartView = Marionette.ItemView.extend({
    template: resultDetailsCuahsiChartTmpl,
});

var ResultMapPopoverDetailView = Marionette.LayoutView.extend({
    template: resultMapPopoverDetailTmpl,

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

var ResultMapPopoverListItemView = Marionette.ItemView.extend({
    template: resultMapPopoverListItemTmpl,

    ui: {
        selectButton: '.data-catalog-popover-list-item-btn'
    },

    events: {
        'click @ui.selectButton': 'selectItem',
        'mouseover': 'highlightResult',
        'mouseout': 'unHighlightResult'
    },

    templateHelpers: function() {
        return {
            catalog: this.options.catalog
        };
    },

    selectItem: function() {
        this.options.popoverModel.set('activeResult', this.model);
    },

    highlightResult: function() {
        App.map.set('dataCatalogActiveResult', this.model);
        this.model.set('active', true);
    },

    unHighlightResult: function() {
        App.map.set('dataCatalogActiveResult', null);
        this.model.set('active', false);
    }
});

var ResultMapPopoverListView = Marionette.CompositeView.extend({
    template: resultMapPopoverListTmpl,
    childView: ResultMapPopoverListItemView,
    childViewContainer: '.data-catalog-popover-result-list',
    childViewOptions: function() {
        return {
            popoverModel: this.options.popoverModel,
            catalog: this.options.catalog
        };
    },

    ui: {
        prevPage: '[data-action="prev-page"]',
        nextPage: '[data-action="next-page"]'
    },

    events: {
        'click @ui.prevPage': 'prevPage',
        'click @ui.nextPage': 'nextPage'
    },

    templateHelpers: function() {
        return {
            numResults: this.collection.fullCollection.length,
            pageNum: this.collection.state.currentPage,
            numPages: this.collection.state.totalPages,
            hasNextPage: this.collection.hasNextPage(),
            hasPrevPage: this.collection.hasPreviousPage()
        };
    },

    prevPage: function() {
        this.collection.getPreviousPage();
        this.render();
    },

    nextPage: function() {
        this.collection.getNextPage();
        this.render();
    }
});

var ResultMapPopoverControllerView = Marionette.LayoutView.extend({
    // model: PopoverControllerModel
    template: resultMapPopoverControllerTmpl,

    regions: {
        container: '.data-catalog-popover-container'
    },

    ui: {
        back: '.data-catalog-popover-back-btn'
    },

    events: {
        'click @ui.back': 'backToList'
    },

    initialize: function() {
        this.model = new models.PopoverControllerModel();
        this.model.on('change:activeResult', this.render);
    },

    onRender: function() {
        var activeResult = this.model.get('activeResult');
        if (activeResult) {
            this.container.show(new ResultMapPopoverDetailView({
                model: activeResult,
                catalog: this.options.catalog
            }));
        } else {
            App.map.set('dataCatalogActiveResult', null);
            this.model.set('active', false);
            this.container.show(new ResultMapPopoverListView({
                collection: this.collection,
                popoverModel: this.model,
                catalog: this.options.catalog
            }));
        }
    },

    backToList: function() {
        this.model.set('activeResult', null);
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

var FilterBaseView = Marionette.ItemView.extend({
    className: 'data-catalog-filter-group'
});

var DateFilterView = FilterBaseView.extend({
    // model: DateFilterModel
    template: dateFilterTmpl,

    ui: {
        dateInput: '.data-catalog-date-input',
        clearable: '.data-catalog-clearable-input a'
    },

    events: {
        'change @ui.dateInput': 'onDateInputChanged',
        'click @ui.clearable': 'onClearInput'
    },

    modelEvents: {
        'change': 'render'
    },

    onRender: function() {
        this.ui.dateInput.datepicker();
    },

    onClearInput: function(e) {
        var $el = $(e.currentTarget).siblings('input').val('');
        this.updateDateInput($el);
    },

    onDateInputChanged: function(e) {
        this.updateDateInput($(e.currentTarget));
    },

    updateDateInput: function($dateEl) {
        var isFromDate = $dateEl.hasClass('from-date'),
            attr = isFromDate ? 'fromDate' : 'toDate';

        this.model.set(attr, $dateEl.val());
    }
});

var CheckboxFilterView = FilterBaseView.extend({
    // model: CheckboxFilterModel

    template: checkboxFilterTmpl,

    ui: {
        checkbox: 'input',
    },

    events: {
        'change @ui.checkbox': 'toggleState'
    },

    modelEvents: {
        'change:active': 'render'
    },

    toggleState: function() {
        this.model.set('active', !this.model.get('active'));
    }
});


var FilterSidebar = Marionette.CompositeView.extend({
    // collection: FilterCollection

    className: 'data-catalog-filter-window',
    template: filterSidebarTmpl,

    ui: {
        reset: '[data-action="reset-filters"]'
    },

    events: {
        'click @ui.reset': 'clearFilters'
    },

    getChildView: function(item) {
        var type = item.get('type');
        if  (type === 'date') {
            return DateFilterView;
        } else if (type === 'checkbox'){
            return CheckboxFilterView;
        }

        window.console.error("Filter model type",
                             type, " unsupported.",
                             "Write it a view.");
        return null;
    },

    clearFilters: function() {
        this.collection.forEach(function(model) { model.reset(); });
    }
});


module.exports = {
    HeaderView: HeaderView,
    ResultsWindow: ResultsWindow
};
