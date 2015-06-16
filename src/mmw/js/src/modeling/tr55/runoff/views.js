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

        var selector = '.runoff-chart-container ' + '.bar-chart';
        $(selector).empty();
        var result = this.model.get('result');
        if (result) {
            var indVar = 'type',
                depVars = ['inf', 'runoff', 'et'],
                data = [
                    getBarData('Original', 'unmodified'),
                    getBarData('Modified', 'modified')
                ],
                options = {
                    barColors: ['#329b9c', '#4aeab3', '#4ebaea'],
                    depAxisLabel: 'Level',
                    depDisplayNames: ['Infiltration', 'Runoff', 'Evaporation']
                };
            chart.makeBarChart(selector, data, indVar, depVars, options);
        }
    }
});

module.exports = {
    ResultView: ResultView
};
