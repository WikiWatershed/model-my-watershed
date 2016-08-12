"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../../../shim/backbone.marionette'),
    resultTmpl = require('./templates/result.html'),
    tableTmpl = require('./templates/table.html');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',

    template: resultTmpl,

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

        if (result && result.Loads) {
            if (!this.compareMode) {
                this.tableRegion.show(new TableView({
                    model: this.model,
                }));
            }
        }
    }
});

var TableView = Marionette.CompositeView.extend({
    template: tableTmpl,

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
    }
});

module.exports = {
    ResultView: ResultView
};
