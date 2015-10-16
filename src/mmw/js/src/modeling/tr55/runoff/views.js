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
            // If Pre-Columbian results are not there, use present day
            // results.
            if (name === 'pc_modified' && !result[name]) {
                name = 'modified';
            } else if (name === 'pc_unmodified' && !result[name]) {
                name = 'unmodified';
            }

            // A recently created scenario (if the `name` variable was
            // unchanged above), or scenario created prior to pull
            // request 716 (if it was changed).
            if (result[name]) {
                return {
                    type: displayName,
                    inf: result[name]['inf'],
                    runoff: result[name]['runoff'],
                    et: result[name]['et']
                };
            } else { // An ancient scenario.
                return {
                    type: displayName,
                    inf: result[name]['inf'] || 0.0,
                    runoff: result[name]['runoff'] || 0.0,
                    et: result[name]['et'] || 0.0
                };
            }
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
                var target_result = 'modified';
                if (this.scenario.get('is_current_conditions')) {
                    target_result = 'unmodified';
                }
                if (this.scenario.get('is_pre_columbian')) {
                    target_result = 'pc_unmodified';
                }
                data = [
                    getBarData('', target_result)
                ];
                this.$el.addClass('current-conditions');
            } else if (this.scenario.get('is_current_conditions')) {
                data = [
                    getBarData('100% Forest', 'pc_unmodified'),
                    getBarData('Current Conditions', 'unmodified')
                ];
            } else {
                // Show the unmodified results and the modified
                // results.
                data = [
                    getBarData('Current Conditions', 'unmodified'),
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
