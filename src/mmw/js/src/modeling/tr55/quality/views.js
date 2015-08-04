"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    DataCollection = require('../../../core/models.js').DataCollection,
    chart = require('../../../core/chart.js'),
    barChartTmpl = require('../../../core/templates/barChart.html'),
    resultTmpl = require('./templates/result.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
    tableTmpl = require('./templates/table.html');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',
    id: function() {
        return this.model.get('name');
    },
    template: resultTmpl,
    attributes: {
        role: 'tabpanel'
    },
    regions: {
        tableRegion: '.quality-table-region',
        chartRegion: '.quality-chart-region'
    },
    modelEvents: {
        change: 'onShow'
    },
    onShow: function() {
        this.tableRegion.reset();
        this.chartRegion.reset();
        if (this.model.get('result')) {
            var dataCollection = new DataCollection(
                this.model.get('result')
            );

            this.tableRegion.show(new TableView({
                collection: dataCollection
            }));

            this.chartRegion.show(new ChartView({
                model: this.model,
                collection: dataCollection
            }));
        }
    }
});

var TableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: tableRowTmpl,

    templateHelpers: function() {
        return {
            roundedLoad: this.model.get('load').toFixed(3)
        };
    }
});

var TableView = Marionette.CompositeView.extend({
    childView: TableRowView,
    childViewContainer: 'tbody',
    template: tableTmpl
});

var ChartView = Marionette.ItemView.extend({
    template: barChartTmpl,
    className: 'chart-container quality-chart-container',

    onAttach: function() {
        this.addChart();
    },

    addChart: function() {
        var selector = '.quality-chart-container .bar-chart',
            chartData = this.collection.map(function(model) {
                return model.attributes;
            }),
            chartOptions = {
                isPercentage: false,
                depAxisLabel: 'Load (Kg)',
                useHorizBars: true,
                horizMargin: {top: 20, right: 80, bottom: 40, left: 150}
            },
            depVars = ['load'],
            indVar = 'measure';

        chart.makeBarChart(selector, chartData, indVar, depVars, chartOptions);
    }
});

module.exports = {
    ResultView: ResultView
};
