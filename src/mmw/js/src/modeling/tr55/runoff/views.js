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
                    barColors: ['#329b9c', '#4aeab3', '#4ebaea'],
                    depAxisLabel: 'Level',
                    depDisplayNames: ['Infiltration', 'Runoff', 'Evaporation']
                };

            if (this.scenario.get('is_current_conditions')) {
                data = [
                    getBarData('', 'unmodified'),
                ];
                this.$el.addClass('current-conditions');
            } else {
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
