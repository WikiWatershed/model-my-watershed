"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../../../shim/backbone.marionette'),
    resultTmpl = require('./templates/result.html'),
    tableTmpl = require('./templates/table.html'),
    utils = require('../../../core/utils.js'),
    constants = require('./constants');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',

    template: resultTmpl,

    ui: {
        tooltip: 'a.model-results-tooltip'
    },

    regions: {
        tableRegion: '.quality-table-region',
    },

    modelEvents: {
        'change': 'onShow'
    },

    initialize: function(options) {
        this.compareMode = options.compareMode;
        this.scenario = options.scenario;
    },

    onShow: function() {
        var result = this.model.get('result');
        this.tableRegion.reset();
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
    }
});

var TableView = Marionette.CompositeView.extend({
    template: tableTmpl,

    ui: {
        downloadLoadsCSV: '[data-action="download-csv-granular"]',
        downloadSummaryLoadsCSV: '[data-action="download-csv-summary"]'
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
            summaryColumns: summaryColumns,
            summaryRows: summaryRows,
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
        var data = this.model.get('result').Loads,
            prefix = 'mapshed_water_quality_loads_',
            nameMap = constants.waterQualityLoadsCSVColumnMap;
        this.downloadCSV(data, prefix, nameMap);
    },

    downloadCSVSummary: function() {
        var data = this.model.get('result').SummaryLoads,
            prefix = 'mapshed_water_quality_summary_loads_',
            nameMap = constants.waterQualitySummaryLoadsCSVColumnMap;
        this.downloadCSV(data, prefix, nameMap);
    },

    downloadCSV: function(data, filePrefix, nameMap) {
        var timestamp = new Date().toISOString(),
            filename = filePrefix + timestamp,
            renamedData = utils.renameCSVColumns(data, nameMap);
        utils.downloadDataCSV(renamedData, filename);
    }
});

module.exports = {
    ResultView: ResultView
};
