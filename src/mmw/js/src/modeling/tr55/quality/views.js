"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Backbone = require('../../../../shim/backbone'),
    Marionette = require('../../../../shim/backbone.marionette'),
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
                var dataCollection = new Backbone.Collection(
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
    template: tableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    }
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
            data = this.collection.map(function(model) {
                return {
                    x: model.attributes.measure,
                    y: model.attributes.load
                };
            }),
            chartOptions = {
                yAxisLabel: 'Load (kg)',
                abbreviateTicks: true
            };

        chart.renderHorizontalBarChart(chartEl, data, chartOptions);
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
        function getData(result, seriesDisplayNames) {
            return _.map(seriesDisplayNames, function(seriesDisplayName, seriesInd) {
                return {
                    key: seriesDisplayName,
                    values: [
                        {
                            x: '',
                            y: result[seriesInd].load
                        }
                    ]
                };
            });
        }

        var chartEl = this.$el.find('.bar-chart').get(0),
            result = this.model.get('result'),
            seriesDisplayNames = ['Oxygen Demand',
                                  'Suspended Solids',
                                  'Nitrogen',
                                  'Phosphorus'],
            data,
            chartOptions;

        $(chartEl).empty();

        if (result) {
            data = getData(result, seriesDisplayNames);
            chartOptions = {
                seriesColors: ['#1589ff', '#4aeab3', '#4ebaea', '#329b9c'],
                yAxisLabel: 'Load (kg)',
                yAxisUnit: 'kg',
                margin: {top: 20, right: 0, bottom: 40, left: 60},
                abbreviateTicks: true
            };

            chart.renderVerticalBarChart(chartEl, data, chartOptions);
        }
    }
});

module.exports = {
    ResultView: ResultView
};
