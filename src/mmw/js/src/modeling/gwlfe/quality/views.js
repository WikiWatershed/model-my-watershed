"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../../../shim/backbone.marionette'),
    App = require('../../../app'),
    resultTmpl = require('./templates/result.html'),
    tableTmpl = require('./templates/table.html'),
    utils = require('../../../core/utils');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',

    template: resultTmpl,

    ui: {
        tooltip: 'a.model-results-tooltip',
        subbasinResultsLink: '[data-action="view-subbasin-attenuated-results"]',
    },

    events: {
        'click @ui.subbasinResultsLink': 'viewSubbasinResults',
    },

    regions: {
        tableRegion: '.quality-table-region',
    },

    modelEvents: {
        'change': 'onShow'
    },

    templateHelpers: function() {
        return {
            showSubbasinModelingButton: utils
                .isWKAoIValidForSubbasinModeling(App.currentProject.get('wkaoi')),
        };
    },

    initialize: function(options) {
        this.compareMode = options.compareMode;
        this.scenario = options.scenario;
    },

    onShow: function() {
        var result = this.model.get('result');
        this.tableRegion.empty();
        this.activateTooltip();

        if (result && result.Loads) {
            if (!this.compareMode) {
                this.tableRegion.show(new TableView({
                    model: this.model,
                }));
            }
        }
    },

    onRender: function() {
        this.activateTooltip();
    },

    activateTooltip: function() {
        this.ui.tooltip.popover({
            placement: 'top',
            trigger: 'focus'
        });
    },

    viewSubbasinResults: function() {
        this.options.showSubbasinHotSpotView();
    },
});

var TableView = Marionette.CompositeView.extend({
    template: tableTmpl,

    ui: {
        downloadLoadsCSV: '[data-action="download-csv-granular"]',
        downloadSummaryLoadsCSV: '[data-action="download-csv-summary"]',
        landuseTable: 'table.landuse',
        summaryTable: 'table.summary'
    },

    events: {
        'click @ui.downloadLoadsCSV': 'downloadCSVGranular',
        'click @ui.downloadSummaryLoadsCSV': 'downloadCSVSummary'
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        function makeRow(addUnit, load) {
            var source = addUnit ? load.Source + ' (' + load.Unit + ')'
                : load.Source;
            return [source, load.Sediment, load.TotalN, load.TotalP];
        }

        var result = this.model.get('result'),
            landUseColumns = ['Sources', 'Sediment (kg)', 'Total Nitrogen (kg)', 'Total Phosphorus (kg)'],
            landUseRows = _.map(result.Loads, _.partial(makeRow, false)),
            summaryColumns = ['Sources', 'Sediment', 'Total Nitrogen', 'Total Phosphorus'],
            summaryRows = _.map(result.SummaryLoads, _.partial(makeRow, true));

        return {
            MeanFlow: result.MeanFlow,
            MeanFlowPerSecond: result.MeanFlowPerSecond,
            landUseColumns: landUseColumns,
            landUseRows: landUseRows,
            landUseClassName: 'landuse',
            summaryColumns: summaryColumns,
            summaryRows: summaryRows,
            summaryClassName: 'summary',
            renderPrecision: {
                summaryTable: [
                    {source: 'Total Loads (kg)', precision: 1},
                    {source: 'Loading Rates (kg/ha)', precision: 2},
                    {source: 'Mean Annual Concentration (mg/l)', precision: 2},
                    {source: 'Mean Low-Flow Concentration (mg/l)', precision: 2}],
                landUseTable: [],
            },
            defaultPrecision: {
                summaryTable: 2,
                landUseTable: 1,
            },
        };
    },

    downloadCSVGranular: function() {
        var prefix = 'mapshed_water_quality_loads_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.landuseTable.tableExport({ type: 'csv', fileName: filename });
    },

    downloadCSVSummary: function() {
        var prefix = 'mapshed_water_quality_summary_loads_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.summaryTable.tableExport({ type: 'csv', fileName: filename });
    }
});

module.exports = {
    ResultView: ResultView
};
