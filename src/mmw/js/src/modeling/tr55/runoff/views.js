"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Backbone = require('backbone'),
    Marionette = require('../../../../shim/backbone.marionette'),
    chart = require('../../../core/chart.js'),
    barChartTmpl = require('../../../core/templates/barChart.html'),
    resultTmpl = require('./templates/result.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
    tableTmpl = require('./templates/table.html');

var ResultView = Marionette.LayoutView.extend({
    template: resultTmpl,

    regions: {
        tableRegion: '.runoff-table-region',
        chartRegion: '.runoff-chart-region'
    },

    modelEvents: {
        'change': 'onShow'
    },

    initialize: function(options) {
        this.scenario = options.scenario;
    },

    onShow: function() {
        this.tableRegion.reset();
        this.chartRegion.reset();

        if (this.model.get('result')) {
            var dataCollection = new Backbone.Collection(
                this.model.get('result')
            );

            this.tableRegion.show(new TableView({
                scenario: this.scenario,
                data: dataCollection
            }));

            this.chartRegion.show(new ChartView({
                model: this.model,
                scenario: this.scenario,
                collection: dataCollection
            }));
        }
    }
});

var ChartView = Marionette.ItemView.extend({
    template: barChartTmpl,
    className: 'chart-container runoff-chart-container',

    initialize: function(options) {
        this.scenario = options.scenario;
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
                labelNames = ['pc_unmodified', 'unmodified'];
                labelDisplayNames = ['100% Forest', 'Current Conditions'];
            } else {
                labelNames = ['unmodified', 'modified'];
                labelDisplayNames = ['Current Conditions', 'Modified'];
            }

            data = getData(result, seriesNames, seriesDisplayNames,
                           labelNames, labelDisplayNames);
            chartOptions = {
                seriesColors: ['#F8AA00', '#CF4300', '#C2D33C'],
                yAxisLabel: 'Level (cm)',
                yAxisUnit: 'cm',
                reverseLegend: true,
                disableToggle: true,
                margin: this.compareMode ? {top: 20, right: 0, bottom: 40, left: 60} : undefined
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

    initialize: function(options) {
        this.collection = this.formatData(options.data, options.scenario);
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    formatData: function(data, scenario) {
        // The TR55 results should be broken down into:
        // Scenario | Runoff Type | Depth
        var tr55Results = data.first().attributes,
            collection = new Backbone.Collection(),
            // If not Current Conditions, match the graph by calling
            // the scenario "modified"
            label = 'Modified';

        // Special cases:  100% Forest may exist as pc_unmodified if scenario
        // is_current_conditions, otherwise we also want to include unmodified
        // which is the value of `Current Conditions`.
        if (scenario.get('is_current_conditions')) {
            collection.add(this.makeRowsForScenario(tr55Results.pc_unmodified,
                '100% Forest'));
            label = scenario.get('name');
        } else {
            collection.add(this.makeRowsForScenario(tr55Results.unmodified,
                'Current Conditions'));
        }

        collection.add(this.makeRowsForScenario(tr55Results.modified, label));

        return collection;
    },

    makeRowsForScenario: function(tr55Results, scenarioName) {
        var self = this;
        return _.map(this.runoffTypes, function(runoffType) {
            return _.extend(self.getRunoffTypeValue(tr55Results, runoffType), {
                scenario: scenarioName
            });
        });
    },

    getRunoffTypeValue: function(tr55ResultRow, runoffType) {
        return {
            runoffType: runoffType.display,
            depth: tr55ResultRow[runoffType.name]
        };
    }
});

module.exports = {
    ResultView: ResultView
};
