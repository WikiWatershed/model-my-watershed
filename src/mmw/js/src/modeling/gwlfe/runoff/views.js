"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../../../../shim/backbone.marionette'),
    settings = require('../../../core/settings'),
    coreUnits = require('../../../core/units'),
    chart = require('../../../core/chart.js'),
    barChartTmpl = require('../../../core/templates/barChart.html'),
    modelingConstants = require('../../constants'),
    modelingUtils = require('../../utils'),
    selectorTmpl = require('./templates/selector.html'),
    resultTmpl = require('./templates/result.html'),
    tableTmpl = require('./templates/table.html'),
    gwlfeViews = require('../views');

var runoffVars = [
        { name: 'AvStreamFlow', display: 'Stream Flow' },
        { name: 'AvRunoff', display: 'Surface Runoff' },
        { name: 'AvGroundWater', display: 'Subsurface Flow' },
        { name: 'AvPtSrcFlow', display: 'Point Src Flow' },
        { name: 'AvEvapoTrans', display: 'ET' },
        { name: 'AvPrecipitation', display: 'Precip' },
    ],
    monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',

    template: resultTmpl,

    regions: {
        selectorRegion: '.runoff-selector-region',
        layerRegion: '.layer-region',
        chartRegion: '.runoff-chart-region',
        tableRegion: '.runoff-table-region'
    },

    ui: {
        tooltip: 'a.model-results-tooltip',
    },

    modelEvents: {
        'change': 'onShow'
    },

    templateHelpers: function() {
        var scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name,
            gis_data = this.scenario.getModifiedGwlfeGisData(),
            weather_type = this.scenario.get('weather_type'),
            weather_simulation = this.scenario.get('weather_simulation'),
            weather_simulation_label = weather_simulation &&
                _.chain(modelingConstants.Simulations)
                    .flatMap(function(g) { return g.items; })
                    .find(function(i) { return i.name === weather_simulation; })
                    .value()
                    .label,
            weather_custom = this.scenario.get('weather_custom');

        return {
            lengthUnit: lengthUnit,
            weather_type: weather_type,
            weather_simulation: weather_simulation_label,
            weather_custom: modelingUtils.getFileName(weather_custom, '.csv'),
            years: gis_data.WxYrs,
        };
    },

    initialize: function(options) {
        this.compareMode = options.compareMode;
        this.scenario = options.scenario;

        this.model.set('activeVar', runoffVars[0].name);
    },

    onShow: function() {
        this.selectorRegion.empty();
        this.layerRegion.show(new gwlfeViews.WeatherStationLayerToggleView({
            weather_type: this.scenario.get('weather_type'),
        }));
        this.tableRegion.empty();
        this.chartRegion.empty();
        this.activateTooltip();

        if (this.model.get('result')) {
            if (!this.compareMode) {
                this.tableRegion.show(new TableView({
                    model: this.model,
                }));
            }

            this.selectorRegion.show(new SelectorView({
                model: this.model
            }));

            this.chartRegion.show(new ChartView({
                model: this.model,
                scenario: this.scenario,
                compareMode: this.compareMode
            }));
        }
    },

    onRender: function() {
        this.activateTooltip();
    },

    activateTooltip: function() {
        this.ui.tooltip.popover({
            placement: 'top',
            trigger: 'focus'
        });
    }
});

var SelectorView = Marionette.ItemView.extend({
    template: selectorTmpl,

    ui: {
        runoffVarSelector: 'select'
    },

    events: {
        'change @ui.runoffVarSelector': 'updateRunoffVar'
    },

    modelEvents: {
        'change:activeVar': 'render'
    },

    updateRunoffVar: function() {
        var activeRunoffVar = this.ui.runoffVarSelector.val();
        this.model.set('activeVar', activeRunoffVar);
    },

    templateHelpers: function() {
        return {
            runoffVars: runoffVars
        };
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
        var chartEl = this.$el.find('.bar-chart').get(0),
            scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name,
            result = this.model.get('result'),
            activeVar = this.model.get('activeVar');

        $(chartEl).empty();

        if (result) {
            var data = [
                    {
                        key: _.find(runoffVars, {name: activeVar}).display,
                        values: _.map(result.monthly, function(monthResult, monthInd) {
                            return {
                                x: monthInd,
                                y: coreUnits.get('LENGTH_S', Number(monthResult[activeVar]) / 100).value
                            };
                        })
                    }
                ],
                chartOptions = {
                    yAxisLabel: 'Water Depth (' + lengthUnit + ')',
                    yAxisUnit: lengthUnit,
                    xAxisLabel: function(xValue) {
                        return monthNames[xValue];
                    },
                    xTickValues: _.range(12),
                    margin: this.compareMode ?
                        {top: 20, right: 120, bottom: 40, left: 60} :
                        {top: 20, right: 20, bottom: 40, left: 60}
                };

            chart.renderLineChart(chartEl, data, chartOptions);
        }
    }

});

function monthSorter(a, b) {
    if (a.month < b.month) {
        return -1;
    } else if (a.month > b.month) {
        return 1;
    }
    return 0;
}

window.monthSorter = monthSorter;

function SumFormatter(data) {
    var field = this.field,
        total = _.sum(_.map(data, function(row) {
            return parseFloat(row[field]);
        }));

    return total.toFixed(2);
}
window.sumFormatter = SumFormatter;

var TableView = Marionette.CompositeView.extend({
    template: tableTmpl,

    ui: {
        downloadCSV: '[data-action="download-csv"]',
        table: 'table'
    },

    events: {
        'click @ui.downloadCSV': 'downloadCSV'
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        var scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name,
            columnNames = ['Month'].concat(_.map(runoffVars, function(runoffVar) {
                return runoffVar.display + ' (' + lengthUnit + ')';
            })),
            rows = _.map(this.model.get('result').monthly, function(month, i) {
                return [i].concat(_.map(runoffVars, function(runoffVar) {
                    return coreUnits.get('LENGTH_S', Number(month[runoffVar.name]) / 100).value;
                }));
            });

        return {
            columnNames: columnNames,
            rows: rows,
            monthNames: monthNames,
        };
    },

    downloadCSV: function() {
        var prefix = 'mapshed_hydrology_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.table.tableExport({ type: 'csv', fileName: filename });
    },
});

module.exports = {
    TableView: TableView,
    ResultView: ResultView
};
