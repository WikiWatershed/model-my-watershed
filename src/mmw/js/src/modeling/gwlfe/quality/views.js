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
        function makeRow(load) {
            return [load.Source, load.Sediment, load.TotalN, load.TotalP];
        }

        var result = this.model.get('result'),
            columnNames = ['Sources', 'Sediment (kg)', 'Total Nitrogen (kg)', 'Total Phosphorus (kg)'],
            landUseRows = _.map(result.Loads.slice(0,15), makeRow),
            summaryRows = _.map(result.Loads.slice(15), makeRow);

        return {
            MeanFlow: result.MeanFlow,
            MeanFlowPerSecond: result.MeanFlowPerSecond,
            columnNames: columnNames,
            landUseRows: landUseRows,
            summaryRows: summaryRows
        };
    }
});

module.exports = {
    ResultView: ResultView
};
