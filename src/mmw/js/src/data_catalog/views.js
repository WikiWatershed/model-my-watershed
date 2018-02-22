"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    HighstockChart = require('../../shim/highstock'),
    App = require('../app'),
    analyzeViews = require('../analyze/views.js'),
    settings = require('../core/settings'),
    utils = require('../core/utils'),
    models = require('./models'),
    errorTmpl = require('./templates/error.html'),
    dateFilterTmpl = require('./templates/dateFilter.html'),
    checkboxFilterTmpl = require('./templates/checkboxFilter.html'),
    filterSidebarTmpl = require('./templates/filterSidebar.html'),
    formTmpl = require('./templates/form.html'),
    pagerTmpl = require('./templates/pager.html'),
    searchResultCinergiTmpl = require('./templates/searchResultCinergi.html'),
    searchResultHydroshareTmpl = require('./templates/searchResultHydroshare.html'),
    searchResultCuahsiTmpl = require('./templates/searchResultCuahsi.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    headerTmpl = require('./templates/header.html'),
    windowTmpl = require('./templates/window.html'),
    resultDetailsCinergiTmpl = require('./templates/resultDetailsCinergi.html'),
    resultDetailsHydroshareTmpl = require('./templates/resultDetailsHydroshare.html'),
    resultDetailsCuahsiTmpl = require('./templates/resultDetailsCuahsi.html'),
    resultDetailsCuahsiStatusTmpl = require('./templates/resultDetailsCuahsiStatus.html'),
    resultDetailsCuahsiSwitcherTmpl = require('./templates/resultDetailsCuahsiSwitcher.html'),
    resultDetailsCuahsiChartTmpl = require('./templates/resultDetailsCuahsiChart.html'),
    resultDetailsCuahsiTableTmpl = require('./templates/resultDetailsCuahsiTable.html'),
    resultDetailsCuahsiTableRowVariableColTmpl = require('./templates/resultDetailsCuahsiTableRowVariableCol.html'),
    resultsWindowTmpl = require('./templates/resultsWindow.html'),
    resultMapPopoverDetailTmpl = require('./templates/resultMapPopoverDetail.html'),
    resultMapPopoverListTmpl = require('./templates/resultMapPopoverList.html'),
    resultMapPopoverListItemTmpl = require('./templates/resultMapPopoverListItem.html'),
    resultMapPopoverControllerTmpl = require('./templates/resultMapPopoverController.html'),
    expandableTableRowTmpl = require('./templates/expandableTableRow.html');

var ENTER_KEYCODE = 13,
    PAGE_SIZE = settings.get('data_catalog_page_size'),
    CATALOG_RESULT_TEMPLATE = {
        cinergi: searchResultCinergiTmpl,
        hydroshare: searchResultHydroshareTmpl,
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

    onBeforeDestroy: function() {
        this.setVisibility(false);
        App.map.set({
            'dataCatalogResults': null,
            'dataCatalogActiveResult': null,
            'dataCatalogDetailResult': null,
        });
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

        // Show search results if query already exists
        if (this.model.get('query') !== '') {
            this.ui.introText.addClass('hide');
            this.ui.tabs.removeClass('hide');

            // Show detail result if selected
            this.onDetailResultChange();
        }
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

        // Set pagination class for height adjustment
        if (nextCatalog.get('is_pageable')) {
            this.contentsRegion.currentView.$el.addClass('paginated');
        } else {
            this.contentsRegion.currentView.$el.removeClass('paginated');
        }

        this.doSearch();
    },

    onDetailResultChange: function() {
        var activeCatalog = this.collection.getActiveCatalog(),
            ResultDetailsView = CATALOG_RESULT_DETAILS_VIEW[activeCatalog.id],
            detailResult = activeCatalog.get('detail_result');

        if (!detailResult) {
            this.detailsRegion.empty();
            this.updateMap();
            App.map.set('dataCatalogDetailResult', null);
            this.formRegion.$el.removeClass('hidden');
            this.panelsRegion.$el.removeClass('hidden');
            this.contentsRegion.$el.removeClass('hidden');
        } else {
            this.formRegion.$el.addClass('hidden');
            this.panelsRegion.$el.addClass('hidden');
            this.contentsRegion.$el.addClass('hidden');
            this.hideFilterSidebar();
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
            this.bindDataCatalogPopovers(catalog);
        }
    },

    bindDataCatalogPopovers: function(catalog) {
        if (!catalog) {
            catalog = this.collection.getActiveCatalog();
        }

        if (catalog) {
            App.getMapView().bindDataCatalogPopovers(
                ResultMapPopoverDetailView, ResultMapPopoverControllerView,
                catalog.id, catalog.get('results'));
        }
    },

    hideFilterSidebar: function() {
        if (App.rootView.secondarySidebarRegion.hasView()) {
            App.rootView.secondarySidebarRegion.empty();
            App.map.toggleSecondarySidebar();
        }
    },

    // Enables or disables map item visibility
    // For when the DataCatalogWindow is loaded but hidden
    // Such as when showing the Analyze or Model tab instead of Monitor
    setVisibility: function(visible) {
        App.map.set('dataCatalogVisible', visible);

        if (visible) {
            this.bindDataCatalogPopovers();
        } else {
            this.hideFilterSidebar();
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
        searchInput: 'input[type="text"]',
        downloadButton: '#bigcz-catalog-results-download',
    },

    events: {
        'keyup @ui.searchInput': 'onSearchInputChanged',
        'click @ui.filterToggle': 'onFilterToggle',
        'click @ui.downloadButton': 'downloadResults',
    },

    onBeforeDestroy: function() {
        App.rootView.secondarySidebarRegion.empty();
    },

    initialize: function() {
        var self = this,
            updateFilterSidebar = function() {
                if (App.rootView.secondarySidebarRegion.hasView()) {
                    self.showFilterSidebar();
                }

                self.render();
            };

        // Update the filter sidebar when there's a new active catalog
        this.listenTo(this.collection, 'change:active', updateFilterSidebar);

        // Update the download button visibility on catalog load events
        this.collection.forEach(function(catalog) {
            self.listenTo(catalog, 'change:loading', self.render);
        });
    },

    downloadResults: function() {
        var catalog = this.collection.getActiveCatalog(),
            results = catalog && catalog.get('results');

        if (!results) {
            return null;
        }

        var data = results.map(function(r) {
                var exclude = ['show_detail', 'fetching', 'error', 'mode'],
                    cr = _.clone(_.omit(r.attributes, exclude));

                if (!_.isNull(cr.variables)) {
                    cr.variables = cr.variables.map(function(v) {
                        return _.clone(_.omit(v.attributes, ['values', 'error']));
                    });
                }

                return cr;
            }),
            dateString = (new Date()).toJSON()
                                     .replace(/[T:]/g, '-')
                                     .substr(0, 19),  // YYYY-MM-DD-hh-mm-ss
            dashedQuery = this.model.get('query')
                                    .trim()
                                    .toLowerCase()
                                    .replace(/\W+/g, '-'),
            filename = 'bigcz-' + catalog.id + '-' +
                       dashedQuery + '-' + dateString + '.json';

        utils.downloadAsFile(data, filename);
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
        var filters = this.getFilters(),
            numActiveFilters = filters && filters.countActive(),
            filterNumText = numActiveFilters ? '(' + numActiveFilters + ')' : '',
            catalog = this.collection.getActiveCatalog(),
            results = catalog && catalog.get('results'),
            downloadVisible = results && results.length > 0;

        return {
            downloadVisible: downloadVisible,
            filterNumText: filterNumText
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
    className: 'catalog-tab-pane tab-pane',
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
    className: 'catalog-tab-content tab-content paginated',
    childView: TabContentView
});

var StaticResultView = Marionette.ItemView.extend({
    getTemplate: function() {
        return CATALOG_RESULT_TEMPLATE[this.options.catalog];
    },

    templateHelpers: function() {
        if (this.options.catalog === 'cuahsi') {
            return {
                'concept_keywords': this.model.get('variables')
                                              .pluck('concept_keyword')
                                              .filter(utils.distinct)
                                              .join('; '),
            };
        }

        if (this.options.catalog === 'cinergi') {
            return {
                'top_categories': this.model.topCinergiCategories(8)
            };
        }
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
        window.closePopover();
        this.model.collection.closeDetail();
    }
});

var ExpandableTableRow = Marionette.ItemView.extend({
    // model: ExpandableListModel
    template: expandableTableRowTmpl,
    ui: {
        expandButton: '[data-action="expand"]'
    },

    events: {
        'click @ui.expandButton': 'expand'
    },

    modelEvents: {
        'change:expanded': 'render'
    },

    expand: function() {
        this.model.set('expanded', true);
    }
});

var ResultDetailsCinergiView = ResultDetailsBaseView.extend({
    template: resultDetailsCinergiTmpl,

    regions: {
        organizations: '[data-list-region="organizations"]',
        contacts: '[data-list-region="contacts"]',
    },

    templateHelpers: function() {
        var topicCategories = this.model.get('resource_topic_categories');

        return {
            'top_categories': this.model.topCinergiCategories(20),
            'resource_topic_categories_str': topicCategories ?
                topicCategories.join(", ") : null,
            'details_url': this.model.getDetailsUrl()
        };
    },

    onShow: function() {
        var contactOrgs = this.model.get('contact_organizations'),
            contactPeople = this.model.get('contact_people'),
            orgs = contactOrgs ? contactOrgs.filter(utils.distinct) : null,
            contacts =  contactPeople ? contactPeople.filter(utils.distinct) : null;

        this.organizations.show(new ExpandableTableRow({
            model: new models.ExpandableListModel({
                list_type: 'organizations',
                list: orgs
            })
        }));

        this.contacts.show(new ExpandableTableRow({
            model: new models.ExpandableListModel({
                list_type: 'contacts',
                list: contacts
            })
        }));
    }
});

var ResultDetailsHydroshareView = ResultDetailsBaseView.extend({
    template: resultDetailsHydroshareTmpl,

    modelEvents: {
        'change:fetching': 'render',
    },

    templateHelpers: function() {
        var scimeta = this.model.get('scimeta'),
            files = this.model.get('files'),
            details_url = _.find(this.model.get('links'), {'type': 'details'}),
            helpers = {
                details_url: details_url ? details_url.href : null,
                resource_type: '',
                abstract: '',
                creators: [],
                subjects: '',
                files: files ? files.toJSON() : [],
            };

        if (scimeta) {
            var type = scimeta.get('type');

            helpers.resource_type = type.substring(type.lastIndexOf('/') + 1, type.indexOf('Resource'));
            helpers.abstract = scimeta.get('description');
            helpers.creators = scimeta.get('creators').toJSON();
            helpers.subjects = scimeta.get('subjects').pluck('value').join(', ');
        }

        return helpers;
    },

    initialize: function() {
        this.model.fetchHydroshareDetails();
    },

    onDomRefresh: function() {
        window.closePopover();
        this.$('[data-toggle="popover"]').popover({
            placement: 'right',
            trigger: 'focus',
        });
        this.$('[data-toggle="table"]').bootstrapTable();
    },
});

var ResultDetailsCuahsiView = ResultDetailsBaseView.extend({
    template: resultDetailsCuahsiTmpl,

    templateHelpers: function() {
        var id = this.model.get('id'),
            location = id.substring(id.indexOf(':') + 1);

        return {
            location: location,
        };
    },

    ui: _.defaults({
        chartRegion: '#cuahsi-chart-region',
        tableRegion: '#cuahsi-table-region',
    }, ResultDetailsBaseView.prototype.ui),

    regions: {
        statusRegion: '#cuahsi-status-region',
        switcherRegion: '#cuahsi-switcher-region',
        chartRegion: '#cuahsi-chart-region',
        tableRegion: '#cuahsi-table-region',
    },

    modelEvents: {
        'change:mode': 'showChartOrTable',
    },

    initialize: function() {
        this.model.set('mode', 'table');
        this.model.fetchCuahsiValues();
    },

    onShow: function() {
        var variables = this.model.get('variables');

        this.statusRegion.show(new CuahsiStatusView({ model: this.model }));
        this.switcherRegion.show(new CuahsiSwitcherView({ model: this.model }));
        this.tableRegion.show(new CuahsiTableView({ collection: variables }));
    },

    onDomRefresh: function() {
        window.closePopover();
        this.$('[data-toggle="popover"]').popover({
            placement: 'right',
            trigger: 'click',
        });
    },

    showChartOrTable: function() {
        if (this.model.get('mode') === 'table') {
            this.ui.chartRegion.addClass('hidden');
            this.ui.tableRegion.removeClass('hidden');
        } else {
            this.ui.chartRegion.removeClass('hidden');
            this.ui.tableRegion.addClass('hidden');

            if (!this.chartRegion.hasView()) {
                this.chartRegion.show(new CuahsiChartView({
                    collection: this.model.get('variables'),
                }));
            }
        }
    }
});

var CuahsiStatusView = Marionette.ItemView.extend({
    template: resultDetailsCuahsiStatusTmpl,

    modelEvents: {
        'change:fetching change:error': 'render',
    },
});

var CuahsiSwitcherView = Marionette.ItemView.extend({
    template: resultDetailsCuahsiSwitcherTmpl,

    ui: {
        chartButton: '#cuahsi-button-chart',
        tableButton: '#cuahsi-button-table',
    },

    events: {
        'click @ui.chartButton': 'setChartMode',
        'click @ui.tableButton': 'setTableMode',
    },

    modelEvents: {
        'change:fetching change:mode': 'render',
    },

    templateHelpers: function() {
        var fetching = this.model.get('fetching'),
            error = this.model.get('error'),
            last_date = this.model.get('end_date');

        if (!fetching && !error) {
            var variables = this.model.get('variables'),
                last_dates = variables.map(function(v) {
                        var values = v.get('values');

                        if (values.length > 0) {
                            return new Date(values.last().get('datetime'));
                        } else {
                            return new Date('07/04/1776');
                        }
                    });

            last_dates.push(new Date(last_date));
            last_date = Math.max.apply(null, last_dates);
        }

        return {
            last_date: last_date,
        };
    },

    setChartMode: function() {
        this.model.set('mode', 'chart');
    },

    setTableMode: function() {
        this.model.set('mode', 'table');
    }
});

var CATALOG_RESULT_DETAILS_VIEW = {
    cinergi: ResultDetailsCinergiView,
    hydroshare: ResultDetailsHydroshareView,
    cuahsi: ResultDetailsCuahsiView,
};

var CuahsiTableView = Marionette.ItemView.extend({
    tagName: 'table',
    className: 'table custom-hover',
    attributes: {
        'data-toggle': 'table',
    },
    template: resultDetailsCuahsiTableTmpl,

    initialize: function() {
        var self = this;

        this.variableColumnTmpl = resultDetailsCuahsiTableRowVariableColTmpl;

        this.collection.forEach(function(v, index) {
            self.listenTo(v, 'change', _.partial(self.onVariableUpdate, index));
        });
    },

    onAttach: function() {
        var data = this.collection.toJSON(),
            variableColumnFormatter = _.bind(this.variableColumnFormatter, this),
            enablePopovers = _.bind(this.enablePopovers, this);

        this.$el.bootstrapTable({
            data: data,
            columns: [
                {
                    field: 'concept_keyword',
                    formatter: variableColumnFormatter,
                },
                {
                    field: 'most_recent_value',
                },
                {
                    field: 'units',
                }
            ],
            onPostBody: enablePopovers,
        });

        enablePopovers();
    },

    enablePopovers: function() {
        this.$('.variable-popover').popover({
            placement: 'right',
            trigger: 'focus',
        });
    },

    variableColumnFormatter: function(value, row, index) {
        return this.variableColumnTmpl.render(
            this.collection.at(index).toJSON()
        );
    },

    onVariableUpdate: function(index) {
        var row = this.collection.at(index).toJSON();

        this.$el.bootstrapTable('updateRow', {
            index: index,
            row: row,
        });
    }
});

var CuahsiChartView = Marionette.ItemView.extend({
    template: resultDetailsCuahsiChartTmpl,

    ui: {
        'chartDiv': '#cuahsi-variable-chart',
        'select': 'select',
    },

    events: {
        'change @ui.select': 'selectVariable',
    },

    modelEvents: {
        'change:selected': 'renderChart',
    },

    templateHelpers: function() {
        var variables = this.collection.map(function(v) {
                return {
                    id: v.get('id'),
                    concept_keyword: v.get('concept_keyword'),
                    data_type: v.get('data_type'),
                    units: v.get('units'),
                };
            });

        return {
            variables: variables,
        };
    },

    initialize: function(attrs) {
        var selected = this.collection.first().get('id');

        this.model = new Backbone.Model();
        this.model.set({
            selected: selected,
            result: attrs.result,
        });
    },

    selectVariable: function() {
        var selected = this.ui.select.val();

        this.model.set('selected', selected);
    },

    onShow: function() {
        this.renderChart();
    },

    initializeChart: function(variable) {
        var chart = new HighstockChart({
                chart: {
                    renderTo: 'cuahsi-variable-chart',
                },

                rangeSelector: {
                    selected: 1,
                    buttons: [
                        { type: 'week', count: 1, text: '1w' },
                        { type: 'month', count: 1, text: '1m' },
                        { type: 'year', count: 1, text: '1y' },
                    ],
                },

                xAxis: {
                    ordinal: false,
                },

                yAxis: {
                    title: {
                        text: variable.get('units'),
                    }
                },

                // TODO Check why this isn't working
                lang: {
                    thousandsSep: ','
                },

                title : {
                    text : null
                },

                series : [{
                    name : variable.get('concept_keyword'),
                    data : variable.getChartData(),
                    color: '#389b9b',
                    tooltip: {
                        valueSuffix: ' ' + variable.get('units'),
                        valueDecimals: 2,
                    },
                }]
            });

        return chart;
    },

    renderChart: function() {
        var id = this.model.get('selected'),
            variable = this.collection.findWhere({ id: id });

        if (!this.chart) {
            this.chart = this.initializeChart(variable);
        } else {
            this.chart.yAxis[0].setTitle({
                text: variable.get('units'),
            });

            this.chart.series[0].update({
                name: variable.get('concept_keyword'),
                data: variable.getChartData(),
                tooltip: {
                    valueSuffix: ' ' + variable.get('units'),
                },
            });
        }
    }
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
        this.listenTo(this.model, 'change:activeResult', this.onShow);
    },

    onShow: function() {
        var activeResult = this.model.get('activeResult');
        if (activeResult) {
            this.container.show(new ResultMapPopoverDetailView({
                model: activeResult,
                catalog: this.options.catalog
            }));
            this.ui.back.removeClass('hidden');
        } else {
            App.map.set('dataCatalogActiveResult', null);
            this.model.set('active', false);
            this.container.show(new ResultMapPopoverListView({
                collection: this.collection,
                popoverModel: this.model,
                catalog: this.options.catalog
            }));
            this.ui.back.addClass('hidden');
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
        'change': 'render'
    },

    toggleState: function() {
        this.model.set('active', !this.model.get('active'));
    }
});


var FilterSidebar = Marionette.CompositeView.extend({
    // collection: FilterCollection

    className: 'data-catalog-filter-window',
    template: filterSidebarTmpl,
    childViewContainer: '.data-catalog-filter-groups',

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

    initialize: function() {
        var self = this;

        this.collection.forEach(function(model) {
            self.listenTo(model, 'change', self.toggleReset);
        });
    },

    onRender: function() {
        this.toggleReset();
    },

    toggleReset: function() {
        if (this.collection.isDefault()) {
            this.ui.reset.addClass('hidden');
        } else {
            this.ui.reset.removeClass('hidden');
        }
    },

    clearFilters: function() {
        this.collection.forEach(function(model) { model.reset(); });
    }
});


module.exports = {
    DataCatalogWindow: DataCatalogWindow,
    HeaderView: HeaderView,
    ResultsWindow: ResultsWindow
};
