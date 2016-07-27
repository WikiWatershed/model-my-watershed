"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Backbone = require('../../../../shim/backbone'),
    Marionette = require('../../../../shim/backbone.marionette'),
    AoiVolumeModel = require('../models').AoiVolumeModel,
    chart = require('../../../core/chart.js'),
    barChartTmpl = require('../../../core/templates/barChart.html'),
    resultTmpl = require('./templates/result.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
    tableTmpl = require('./templates/table.html'),
    utils = require('../../../core/utils.js');

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
        this.aoiVolumeModel = new AoiVolumeModel({
            areaOfInterest: this.options.areaOfInterest
        });
    },

    onShow: function() {
        this.tableRegion.reset();
        this.chartRegion.reset();
        if (this.model.get('result')) {
            if (this.compareMode) {
                this.chartRegion.show(new CompareChartView({
                    model: this.model,
                    aoiVolumeModel: this.aoiVolumeModel
                }));
            } else {
                var dataCollection = new Backbone.Collection(
                    this.model.get('result').quality.filter(
                        utils.filterOutOxygenDemand
                ));

                this.tableRegion.show(new TableView({
                    aoiVolumeModel: this.aoiVolumeModel,
                    collection: dataCollection
                }));

                this.chartRegion.show(new ChartView({
                    aoiVolumeModel: this.aoiVolumeModel,
                    model: this.model,
                    collection: dataCollection
                }));
            }
        }
    }
});

var TableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: tableRowTmpl,

    templateHelpers: function() {
        var load = this.model.get('load'),
            runoff = this.model.get('runoff'),
            adjustedRunoff = this.options.aoiVolumeModel.adjust(runoff),
            loadingRate = this.options.aoiVolumeModel.getLoadingRate(load),
            concentration = adjustedRunoff ? load / adjustedRunoff : 0;

        return {
            loadingRate: loadingRate,
            concentration: concentration * 1000 // g -> mg
        };
    }
});

var TableView = Marionette.CompositeView.extend({
    childView: TableRowView,
    childViewContainer: 'tbody',
    childViewOptions: function() {
        return {
            aoiVolumeModel: this.options.aoiVolumeModel
        };
    },

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
            aoiVolumeModel = this.options.aoiVolumeModel,
            data = this.collection.map(function(model) {
                var load = model.attributes.load;
                return {
                    x: model.attributes.measure,
                    y: aoiVolumeModel.getLoadingRate(load)
                };
            }),
            chartOptions = {
                yAxisLabel: 'Loading Rate (kg/ha)',
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
                var load = result[seriesInd].load;
                return {
                    key: seriesDisplayName,
                    values: [
                        {
                            x: '',
                            y: aoiVolumeModel.getLoadingRate(load),
                        }
                    ]
                };
            });
        }

        var chartEl = this.$el.find('.bar-chart').get(0),
            result = this.model.get('result').quality.filter(utils.filterOutOxygenDemand),
            aoiVolumeModel = this.options.aoiVolumeModel,
            seriesDisplayNames = ['Suspended Solids',
                                  'Nitrogen',
                                  'Phosphorus'],
            data,
            chartOptions;

        $(chartEl).empty();
        if (result) {
            data = getData(result, seriesDisplayNames);
            chartOptions = {
                seriesColors: ['#4aeab3', '#4ebaea', '#329b9c'],
                yAxisLabel: 'Loading Rate (kg/ha)',
                yAxisUnit: 'kg/ha',
                margin: {top: 20, right: 0, bottom: 40, left: 60},
                reverseLegend: this.compareMode,
                disableToggle: true,
                abbreviateTicks: true
            };

            chart.renderVerticalBarChart(chartEl, data, chartOptions);
        }
    }
});

module.exports = {
    ResultView: ResultView
};
