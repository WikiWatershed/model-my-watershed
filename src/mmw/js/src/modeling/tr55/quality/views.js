"use strict";

var $ = require('jquery'),
    Marionette = require('../../../../shim/backbone.marionette'),
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
        'change': 'onShow'
    },

    initialize: function(options) {
        this.compareMode = options.compareMode;
    },

    onShow: function() {
        this.tableRegion.reset();
        this.chartRegion.reset();
        if (this.model.get('result')) {
            if (this.compareMode) {
                this.chartRegion.show(new CompareChartView({
                    model: this.model
                }));
            } else {
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
    }
});

var TableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: tableRowTmpl
});

var TableView = Marionette.CompositeView.extend({
    childView: TableRowView,
    childViewContainer: 'tbody',
    template: tableTmpl
});

var ChartView = Marionette.ItemView.extend({
    template: barChartTmpl,
    className: 'chart-container quality-chart-container',

    initialize: function(options) {
        this.compareMode = options.compareMode;
    },

    onAttach: function() {
        this.addChart();
    },

    addChart: function() {
        var chartEl = this.$el.find('.bar-chart').get(0),
            chartData = this.collection.map(function(model) {
                return model.attributes;
            }),
            chartOptions = {
                isPercentage: false,
                depAxisLabel: 'Load (kg)',
                useHorizBars: true,
                horizMargin: {top: 20, right: 80, bottom: 40, left: 150}
            },
            depVars = ['load'],
            indVar = 'measure';

        chart.makeBarChart(chartEl, chartData, indVar, depVars, chartOptions);
    }
});

var CompareChartView = Marionette.ItemView.extend({
    template: barChartTmpl,

    className: 'chart-container quality-chart-container',

    modelEvents: {
        'change': 'addChart'
    },

    initialize: function(options) {
        this.scenario = options.scenario;
    },

    onAttach: function() {
        this.addChart();
    },

    addChart: function() {
        function getBarData() {
            return {
                load: '',
                oxygen: result[0].load,
                solids: result[1].load,
                nitrogen: result[2].load,
                phosphorus: result[3].load
            };
        }

        var chartEl = this.$el.find('.bar-chart').get(0),
            result = this.model.get('result');
        $(chartEl).empty();
        if (result) {
            var indVar = 'load',
                depVars = ['oxygen', 'solids', 'nitrogen', 'phosphorus'],
                options = {
                    barColors: ['#1589ff', '#4aeab3', '#4ebaea', '#329b9c'],
                    depAxisLabel: 'Load',
                    depDisplayNames: ['Oxygen Demand',
                                      'Suspended Solids',
                                      'Nitrogen',
                                      'Phosphorus']
                },
                data = [getBarData()];
            chart.makeBarChart(chartEl, data, indVar, depVars, options);
        }
    }
});

module.exports = {
    ResultView: ResultView
};
