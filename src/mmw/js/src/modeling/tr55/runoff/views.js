"use strict";

var $ = require('jquery'),
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
        function getBarData(displayName, name) {
            return {
                type: displayName,
                inf: result[name]['inf'],
                runoff: result[name]['runoff'],
                et: result[name]['et']
            };
        }

        var chartEl = this.$el.find('.bar-chart').get(0),
            result = this.model.get('result');
        $(chartEl).empty();
        if (result) {
            var indVar = 'type',
                depVars = ['inf', 'runoff', 'et'],
                data,
                options = {
                    barColors: ['#F8AA00', '#CF4300', '#C2D33C'],
                    depAxisLabel: 'Level',
                    depDisplayNames: ['Infiltration', 'Runoff', 'Evapotranspiration']
                };

            if (this.compareMode) {
                // Use the modified results since they are the same as the unmodified results
                // in Current Conditions, and they are the results we want to show
                // in compareMode for other scenarios.
                data = [
                    getBarData('', 'modified')
                ];
                this.$el.addClass('current-conditions');
            } else if (this.scenario.get('is_current_conditions')) {
                // Show the unmodified results and the unmodified
                // Pre-Columbian results.
                data = [
                    getBarData('Current Conditions', 'unmodified'),
                    getBarData('Pre-Columbian', 'pc_unmodified')
                ];
            } else {
                // Show the unmodified results and the modified
                // results.
                data = [
                    getBarData('Original', 'unmodified'),
                    getBarData('Modified', 'modified')
                ];
            }
            chart.makeBarChart(chartEl, data, indVar, depVars, options);
        }
    }
});

module.exports = {
    ResultView: ResultView
};
