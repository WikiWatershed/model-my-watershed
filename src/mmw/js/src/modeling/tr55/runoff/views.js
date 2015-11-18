"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../../../shim/backbone.marionette'),
    chart = require('../../../core/chart.js'),
    barChartTmpl = require('../../../core/templates/barChart.html');

var ResultView = Marionette.ItemView.extend({
    template: barChartTmpl,

    className: 'chart-container runoff-chart-container',

    modelEvents: {
        'change': 'addChart'
    },

    initialize: function(options) {
        this.compareMode = options.compareMode;
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
                yAxisLabel: 'Level',
                margin: this.compareMode ? {top: 20, right: 0, bottom: 40, left: 60} : undefined
            };

            chart.renderVerticalBarChart(chartEl, data, chartOptions);
        }
    }
});

module.exports = {
    ResultView: ResultView
};
