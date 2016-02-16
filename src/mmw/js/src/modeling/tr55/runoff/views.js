"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Backbone = require('backbone'),
    Marionette = require('../../../../shim/backbone.marionette'),
    chart = require('../../../core/chart.js'),
    barChartTmpl = require('../../../core/templates/barChart.html'),
    resultTmpl = require('./templates/result.html'),
    AoiVolumeModel = require('../models').AoiVolumeModel,
    tableRowTmpl = require('./templates/tableRow.html'),
    tableTmpl = require('./templates/table.html');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',

    template: resultTmpl,

    regions: {
        tableRegion: '.runoff-table-region',
        chartRegion: '.runoff-chart-region'
    },

    modelEvents: {
        'change': 'onShow'
    },

    initialize: function(options) {
        this.compareMode = options.compareMode;
        this.scenario = options.scenario;
        this.aoi = options.areaOfInterest;
    },

    onShow: function() {
        this.tableRegion.reset();
        this.chartRegion.reset();

        if (this.model.get('result')) {
            var aoiVolumeModel = new AoiVolumeModel({
                areaOfInterest: this.aoi
            });

            if (!this.compareMode) {
                this.tableRegion.show(new TableView({
                    model: this.model,
                    aoiVolumeModel: aoiVolumeModel
                }));
            }

            this.chartRegion.show(new ChartView({
                model: this.model,
                scenario: this.scenario,
                compareMode: this.compareMode
            }));
        }
    }
});

var ChartView = Marionette.ItemView.extend({
    template: barChartTmpl,
    className: 'chart-container runoff-chart-container',

    initialize: function(options) {
        this.scenario = options.scenario;
        this.compareMode = options.compareMode;
    },

    onAttach: function() {
        this.addChart();
    },

    addChart: function() {
        function getData(result, seriesNames, seriesDisplayNames,
                         labelNames, labelDisplayNames) {
            return _.map(seriesNames, function(seriesName, seriesInd) {
                var seriesDisplayName = seriesDisplayNames[seriesInd];
                return {
                    key: seriesDisplayName,
                    values: _.map(labelNames, function(labelName, labelInd) {
                        var labelDisplayName = labelDisplayNames[labelInd];
                        return {
                            x: labelDisplayName,
                            y: result[labelName][seriesName]
                        };
                    })
                };
            });
        }

        var chartEl = this.$el.find('.bar-chart').get(0),
            result = this.model.get('result'),
            seriesNames = ['inf', 'runoff', 'et'],
            seriesDisplayNames = ['Infiltration', 'Runoff', 'Evapotranspiration'],
            labelNames,
            labelDisplayNames,
            data,
            chartOptions;

        $(chartEl).empty();

        if (result) {
            if (this.compareMode) {
                var target_result = 'modified';
                if (this.scenario.get('is_current_conditions')) {
                    target_result = 'unmodified';
                }
                if (this.scenario.get('is_pre_columbian')) {
                    target_result = 'pc_unmodified';
                }
                labelNames = [target_result];
                labelDisplayNames = [''];
                this.$el.addClass('current-conditions');
            } else if (this.scenario.get('is_current_conditions')) {
                labelNames = ['unmodified'];
                labelDisplayNames = ['Current Conditions'];
            } else {
                labelNames = ['modified'];
                labelDisplayNames = ['Modified'];
            }

            data = getData(result, seriesNames, seriesDisplayNames,
                           labelNames, labelDisplayNames);
            chartOptions = {
                seriesColors: ['#F8AA00', '#CF4300', '#C2D33C'],
                yAxisLabel: 'Level (cm)',
                yAxisUnit: 'cm',
                reverseLegend: true,
                disableToggle: true,
                margin: this.compareMode ?
                    {top: 20, right: 0, bottom: 40, left: 60} :
                    {top: 0, right: 0, bottom: 40, left: 150}
            };

            chart.renderVerticalBarChart(chartEl, data, chartOptions);
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

    runoffTypes: [
        { name: 'runoff', display: 'Runoff' },
        { name: 'et', display: 'Evapotranspiration' },
        { name: 'inf', display: 'Infiltration' }
    ],

    initialize: function() {
        this.aoiVolumeModel = this.options.aoiVolumeModel;
        this.tr55Results = this.model.get('result');

        this.collection = this.formatData();
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    formatData: function() {
        // The TR55 results should be broken down into:
        // Runoff Partition | Depth | Volume
        var collection = new Backbone.Collection();

        collection.add(this.makeRowsForScenario('modified'));

        return collection;
    },

    makeRowsForScenario: function(runoffKey) {
        var self = this,
            runoffPartition = this.tr55Results[runoffKey];

        return _.map(this.runoffTypes, function(runoffType) {
            return _.extend(self.getRunoffTypeValue(runoffPartition, runoffType));
        });
    },

    getRunoffTypeValue: function(runoffPartition, runoffType) {
        var depth = runoffPartition[runoffType.name];

        return {
            runoffType: runoffType.display,
            depth: depth,
            adjustedVolume: this.aoiVolumeModel.adjust(depth)
        };
    }
});

module.exports = {
    ResultView: ResultView
};
