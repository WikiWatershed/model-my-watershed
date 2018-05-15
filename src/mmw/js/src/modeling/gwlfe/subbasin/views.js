"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    $ = require('jquery'),
    _ = require('lodash'),
    App = require('../../../app'),
    models = require('./models'),
    resultTmpl = require('./templates/result.html'),
    layerSelectorTmpl = require('./templates/layerSelector.html'),
    tableTabContentTmpl = require('./templates/tableTabContent.html'),
    tableTabPanelTmpl = require('./templates/tableTabPanel.html'),
    huc12TotalsTableTmpl = require('./templates/huc12TotalsTable.html'),
    catchmentTableTmpl = require('./templates/catchmentTable.html'),
    sourcesTableTmpl = require('./templates/sourcesTable.html'),
    hotspotInfoTmpl = require('./templates/hotspotInfo.html');

var ResultView = Marionette.LayoutView.extend({
    // model: ResultModel
    template: resultTmpl,

    regions: {
        layerSelectorRegion: '.subbasin-layer-selector-region',
        tabPanelRegion: '.subbasin-tab-panel-region',
        tabContentRegion: '.subbasin-tab-content-region',
    },

    templateHelpers: function() {
        return {
            aoiDetails: App.currentProject.get('area_of_interest_name'),
        };
    },

    onShow: function() {
        var tabCollection = this.getTabCollection(),
            layerSelector = this.getLayerSelector();

        this.tabPanelRegion.show(new TableTabPanelCollectionView({
            collection: tabCollection,
        }));
        this.tabContentRegion.show(new TableTabContentCollectionView({
            collection: tabCollection,
            model: this.model,
            showHuc12: this.options.showHuc12,
        }));
        if (layerSelector) {
            this.layerSelectorRegion.show(layerSelector);
        }
    },

    getTabCollection: function() {
        return new models.SubbasinTabCollection([
            new models.SubbasinTabModel({
                displayName: 'Sources',
                name: 'aoiSources',
            }),
            new models.SubbasinTabModel({
                displayName: 'HUC-12',
                name: 'huc12Totals',
            }),
        ]);
    },

    getLayerSelector: function() {
        return null;
    }
});

var LayerSelectorView = Marionette.ItemView.extend({
    // model: SubbasinDetailModel
    template: layerSelectorTmpl,
    className: 'dropdown',

    events: {
        'click a.layer-option': 'selectLoad',
    },

    modelEvents: {
        'change:selectedLoad': 'render',
    },

    templateHelpers: function() {
        var layers = [
                { id: 'TotalN', name: 'Total Nitrogen' },
                { id: 'TotalP', name: 'Total Phosphorous' },
                { id: 'Sediment', name: 'Total Sediments' }
            ],
            selectedLoad = this.model.get('selectedLoad'),
            selectedLoadName = selectedLoad &&
                               _.findWhere(layers, { id: selectedLoad }).name;

        return {
            layers: layers,
            selectedLoad: selectedLoad,
            selectedLoadName: selectedLoadName,
        };
    },

    selectLoad: function(e) {
        var newLoad = e.currentTarget.getAttribute('data-layer-id'),
            currentLoad = this.model.get('selectedLoad');

        if (newLoad === currentLoad) {
            this.model.set('selectedLoad', null);
        } else {
            this.model.set('selectedLoad', newLoad);
        }
    }
});

var TableTabPanelView = Marionette.ItemView.extend({
    // model: SubbasinTabModel
    tagName: 'li',
    template: tableTabPanelTmpl,
    attributes: {
        role: 'presentation',
    },
});

var TableTabPanelCollectionView = Marionette.CollectionView.extend({
    // collection: SubbasinTabCollection
    tagName: 'ul',
    className: 'nav nav-tabs model-nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: TableTabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    },
});

var TableTabContentView = Marionette.LayoutView.extend({
    // model: SubbasinTabModel
    template: tableTabContentTmpl,
    tagName: 'div',
    className: 'tab-pane',
    attributes: {
        role: 'tabpanel',
    },
    regions: {
        tableRegion: '.table-region',
    },

    onShow: function() {
        var tableViewKey = this.model.get('name'),
            TableView = tableViews[tableViewKey];
        if (!TableView) {
            console.error('Use of table view key without TableView: ', tableViewKey);
            return null;
        }

        this.tableRegion.show(new TableView({
            model: this.options.result,
            showHuc12: this.options.showHuc12,
        }));
    },

    id: function() {
        return this.model.get('name');
    }
});

var TableTabContentCollectionView = Marionette.CollectionView.extend({
    // collection: SubbasinTabCollection
    tagName: 'div',
    className: 'tab-content model-tab-content',
    childView: TableTabContentView,
    childViewOptions: function() {
        return {
            result: this.model,
            showHuc12: this.options.showHuc12,
        };
    },
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

var SourcesTableView = Marionette.ItemView.extend({
    template: sourcesTableTmpl,

    ui: {
        'table': 'table.table',
        'downloadCsvButton': '[data-action="download-csv"]',
    },

    events: {
        'click @ui.downloadCsvButton': 'downloadCsv',
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        var result = this.getResult();
        if (!result) { return; }
        return {
            rows: result.Loads,
            summaryRow: result.SummaryLoads,
        };
    },

    getResult: function() {
        return this.model.get('result');
    },

    getCSVFileNamePrefix: function() {
        return 'subbasin_water_quality_loads_';
    },

    downloadCsv: function() {
        var prefix = this.getCSVFileNamePrefix(),
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.table.tableExport({ type: 'csv', fileName: filename });
    }
});

var Huc12SourcesTableView = SourcesTableView.extend({
    getResult: function() {
        var huc12 = App.currentProject.get('subbasins').getActive();
        if (!huc12) { return; }
        return this.model.get('result').HUC12s[huc12.get('id')];
    },

    getCSVFileNamePrefix: function() {
        var huc12 = App.currentProject.get('subbasins').getActive();
        if (!huc12) { return; }
        return 'subbasin_huc12_' + huc12.get('id') + '_water_quality_loads_';
    }
});

var Huc12TotalsTableView = Marionette.ItemView.extend({
    template: huc12TotalsTableTmpl,
    ui: {
        'rows': '.huc12-total',
        'table': 'table.table',
        'downloadCsvButton': '[data-action="download-csv"]',
    },

    events: {
        'click @ui.rows': 'handleRowClick',
        'mouseover @ui.rows': 'handleRowMouseOver',
        'mouseout @ui.rows': 'handleRowMouseOut',
        'click @ui.downloadCsvButton': 'downloadCsv',
    },
    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },
    onRender: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },
    initialize: function() {
        var self = this;
        self.subbasinDetails = App.currentProject.get('subbasins');
        if (this.subbasinDetails.isEmpty()) {
            self.listenToOnce(self.subbasinDetails, 'add', this.renderAndSetup, this);
        } else {
            this.setupSubbasinDetails();
        }
    },

    renderAndSetup: function() {
        this.render();
        this.setupSubbasinDetails();
    },

    setupSubbasinDetails: function() {
        this.subbasinDetails.forEach(function(subbasin) {
            this.listenTo(subbasin, 'change:highlighted', this.highlightRow, this);
            this.listenTo(subbasin, 'change:active', this.options.showHuc12, this);
        }, this);
        this.subbasinDetails.setClickable();
    },

    templateHelpers: function() {
        var result = this.model.get('result');
        return {
            rows: result.HUC12s,
            subbasins: App.currentProject.get('subbasins'),
            summaryRow: result.SummaryLoads,
        };
    },

    handleRowClick: function(e) {
        if (this.subbasinDetails.isEmpty()) { return; }
        var id = e.currentTarget.getAttribute('data-huc12-id');
        App.currentProject.get('subbasins').get(id).setActive();
    },

    handleRowMouseOver: function(e) {
        if (this.subbasinDetails.isEmpty()) { return; }
        var id = e.currentTarget.getAttribute('data-huc12-id');
        App.currentProject.get('subbasins').get(id).set('highlighted', true);
    },

    handleRowMouseOut: function(e) {
        if (this.subbasinDetails.isEmpty()) { return; }
        var id = e.currentTarget.getAttribute('data-huc12-id');
        App.currentProject.get('subbasins').get(id).set('highlighted', false);
    },

    highlightRow: function(subbasinDetail) {
        var rowSelector = '[data-huc12-id="' + subbasinDetail.get('id') + '"]',
            $rows = this.$el.find('.huc12-total'),
            newHighlighted = $rows.filter(rowSelector),
            oldHighlighted = $rows.filter('.highlighted');
        oldHighlighted.removeClass('highlighted');
        if (subbasinDetail.get('highlighted')) {
            newHighlighted.addClass('highlighted');
        }
    },

    downloadCsv: function() {
        var prefix = 'subbasin_huc12_water_quality_totals_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.table.tableExport({ type: 'csv', fileName: filename });
    }
});

var CatchmentsTableView = Marionette.ItemView.extend({
    template: catchmentTableTmpl,
    ui: {
        'rows': '.subbasin-catchment-row',
        'table': 'table.table',
        'downloadCsvButton': '[data-action="download-csv"]',
    },
    events: {
        'mouseover @ui.rows': 'handleRowMouseOver',
        'mouseout @ui.rows': 'handleRowMouseOut',
        'click @ui.downloadCsvButton': 'downloadCsv',
    },
    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },
    onRender: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },
    initialize: function() {
        this.catchmentDetails = App.currentProject.get('subbasins').getActive().get('catchments');
        if (this.catchmentDetails.isEmpty()) {
            this.listenToOnce(this.catchmentDetails, 'add', this.setupAndRender, this);
        } else {
            this.setupCatchmentDetails();
        }
    },

    setupAndRender: function() {
        this.render();
        this.setupCatchmentDetails();
    },

    setupCatchmentDetails: function() {
        this.catchmentDetails.forEach(function(catchment) {
            this.listenTo(catchment, 'change:highlighted', this.highlightRow, this);
        }, this);
    },

    templateHelpers: function() {
        var catchmentDetails = this.catchmentDetails,
            activeSubbasinId = App.currentProject.get('subbasins').getActive().get('id'),
            huc12Result = this.model.get('result').HUC12s[activeSubbasinId],
            catchments = huc12Result.Catchments,
            summaryRow = _.reduce(catchments, function(acc, catchment, comid) {
                var summaryConcentrations = acc.LoadingRateConcentrations,
                    summaryLoadingRates = acc.TotalLoadingRates;

                summaryConcentrations.Sediment += catchment.LoadingRateConcentrations.Sediment;
                summaryConcentrations.TotalN += catchment.LoadingRateConcentrations.TotalN;
                summaryConcentrations.TotalP += catchment.LoadingRateConcentrations.TotalP;
                acc.LoadingRateConcentrations = summaryConcentrations;

                summaryLoadingRates.Sediment += catchment.TotalLoadingRates.Sediment;
                summaryLoadingRates.TotalN += catchment.TotalLoadingRates.TotalN;
                summaryLoadingRates.TotalP += catchment.TotalLoadingRates.TotalP;
                acc.TotalLoadingRates = summaryLoadingRates;
                if (!catchmentDetails.isEmpty()) {
                    acc.Area += catchmentDetails.get(parseInt(comid)).get('area');
                }
                return acc;
            }, {
                    TotalLoadingRates: { Sediment: 0, TotalN: 0, TotalP: 0 },
                    LoadingRateConcentrations: { Sediment: 0, TotalN: 0, TotalP: 0 },
                    Area: 0,
                    Source: 'Entire area',
            });

        return {
            rows: catchments,
            catchmentDetails: catchmentDetails,
            summaryRow: summaryRow,
        };
    },

    handleRowMouseOver: function(e) {
        if (this.catchmentDetails.isEmpty()) { return; }
        var id = e.currentTarget.getAttribute('data-comid');
        this.catchmentDetails.get(id).set('highlighted', true);
    },

    handleRowMouseOut: function(e) {
        if (this.catchmentDetails.isEmpty()) { return; }
        var id = e.currentTarget.getAttribute('data-comid');
        this.catchmentDetails.get(id).set('highlighted', false);
    },

    highlightRow: function(catchment) {
        var rowSelector = '[data-comid="' + catchment.get('id') + '"]',
            $rows = this.$el.find('.subbasin-catchment-row'),
            newHighlighted = $rows.filter(rowSelector),
            oldHighlighted = $rows.filter('.highlighted');
        oldHighlighted.removeClass('highlighted');
        if (catchment.get('highlighted')) {
            newHighlighted.addClass('highlighted');
        }
    },

    downloadCsv: function() {
        var activeSubbasinId = App.currentProject.get('subbasins').getActive().get('id'),
            prefix = 'subbasin_huc12_' + activeSubbasinId + '_catchments_water_quality_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.table.tableExport({ type: 'csv', fileName: filename });
    }
});

var Huc12ResultView = ResultView.extend({
    className: 'result-region',
    templateHelpers: function() {
        var subbasinDetail = App.currentProject.get('subbasins')
                                .getActive();

        if (!subbasinDetail) { return; }
        return {
            aoiDetails: subbasinDetail.get('name') + ', HUC-12 Watershed',
        };
    },

    getTabCollection: function() {
        return new models.SubbasinTabCollection([
            new models.SubbasinTabModel({
                displayName: 'Sources',
                name: 'huc12Sources',
            }),
            new models.SubbasinTabModel({
                displayName: 'Catchments',
                name: 'catchments',
            }),
        ]);
    },

    getLayerSelector: function() {
        return new LayerSelectorView({
            model: this.model,
        });
    },
});

var HotspotInfoView = Marionette.ItemView.extend({
    className: 'subbasin-hotspot-info',
    template: hotspotInfoTmpl,
    events: {
        'click button': 'dismiss',
    },

    dismiss: function() {
        App.user.set('has_seen_hotspot_info', true);
        App.hideMapInfo({ empty: true });

        if (!App.user.get('guest')) {
            $.post('/user/profile', { has_seen_hotspot_info: true });
        }
    }
});


var tableViews = {
    aoiSources: SourcesTableView,
    huc12Totals: Huc12TotalsTableView,
    huc12Sources: Huc12SourcesTableView,
    catchments: CatchmentsTableView,
};

module.exports = {
    ResultView: ResultView,
    Huc12ResultView: Huc12ResultView,
    HotspotInfoView: HotspotInfoView,
};
