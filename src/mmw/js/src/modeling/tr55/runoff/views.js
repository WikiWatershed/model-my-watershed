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
    tableTmpl = require('./templates/table.html'),
    settings = require('../../../core/settings'),
    coreUnits = require('../../../core/units'),
    utils = require('../../../core/utils.js');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',

    template: resultTmpl,

    regions: {
        tableRegion: '.runoff-table-region',
        chartRegion: '.runoff-chart-region'
    },

    ui: {
        downloadCSV: '[data-action="download-csv"]',
        table: '.runoff-table-region'
    },

    events: {
        'click @ui.downloadCSV': 'downloadCSV'
    },

    modelEvents: {
        'change': 'onShow'
    },

    initialize: function(options) {
        this.scenario = options.scenario;
        this.aoi = options.areaOfInterest;
    },

    onShow: function() {
        this.tableRegion.empty();
        this.chartRegion.empty();

        if (this.model.get('result')) {
            var aoiVolumeModel = new AoiVolumeModel({
                areaOfInterest: this.aoi
            });

            this.tableRegion.show(new TableView({
                model: this.scenario,
                aoiVolumeModel: aoiVolumeModel
            }));

            this.chartRegion.show(new ChartView({
                model: this.scenario,
            }));
        }
    },

    downloadCSV: function() {
        var prefix = 'tr55_runoff_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.table.tableExport({ type: 'csv', fileName: filename });
    }
});

var ChartView = Marionette.ItemView.extend({
    // model ScenarioModel
    template: barChartTmpl,
    className: 'chart-container runoff-chart-container',

    onAttach: function() {
        this.addChart();
    },

    addChart: function() {
        function getData(result, seriesNames, seriesDisplayNames,
                         labelDisplayNames) {
            return _.map(seriesNames, function(seriesName, seriesInd) {
                var seriesDisplayName = seriesDisplayNames[seriesInd];
                return {
                    key: seriesDisplayName,
                    values: _.map(labelDisplayNames, function(labelDisplayName) {
                        return {
                            x: labelDisplayName,
                            y: coreUnits.get('LENGTH_S', result[seriesName] / 100).value
                        };
                    })
                };
            });
        }

        var chartEl = this.$el.find('.bar-chart').get(0),
            result = utils.getTR55RunoffResult(this.model),
            seriesNames = ['inf', 'runoff', 'et'],
            seriesDisplayNames = ['Infiltration', 'Runoff', 'Evapotranspiration'],
            scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name,
            labelDisplayNames,
            data,
            chartOptions;

        $(chartEl).empty();

        if (result) {
            if (this.model.get('is_current_conditions')) {
                labelDisplayNames = ['Current Conditions'];
            } else {
                labelDisplayNames = ['Modified'];
            }

            data = getData(result, seriesNames, seriesDisplayNames,
                           labelDisplayNames);
            chartOptions = {
                seriesColors: ['#F8AA00', '#CF4300', '#C2D33C'],
                yAxisLabel: 'Level (' + lengthUnit + ')',
                yAxisUnit: lengthUnit,
                reverseLegend: true,
                disableToggle: true,
                margin: {top: 0, right: 0, bottom: 40, left: 150}
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
    // model ScenarioModel
    childView: TableRowView,
    childViewContainer: 'tbody',
    template: tableTmpl,

    templateHelpers: function() {
        var scheme = settings.get('unit_scheme');

        return {
            lengthUnit: coreUnits[scheme].LENGTH_S.name,
            volumeUnit: coreUnits[scheme].VOLUME.name,
        };
    },

    runoffTypes: [
        { name: 'runoff', display: 'Runoff' },
        { name: 'et', display: 'Evapotranspiration' },
        { name: 'inf', display: 'Infiltration' }
    ],

    initialize: function() {
        this.aoiVolumeModel = this.options.aoiVolumeModel;
        this.runoffResults = utils.getTR55RunoffResult(this.model);
        this.collection = this.formatData();
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    formatData: function() {
        // The TR55 results should be broken down into:
        // Runoff Partition | Depth | Volume
        var collection = new Backbone.Collection();

        collection.add(this.makeRowsForScenario());

        return collection;
    },

    makeRowsForScenario: function() {
        var self = this;

        return _.map(this.runoffTypes, function(runoffType) {
            return _.extend(self.getRunoffTypeValue(self.runoffResults, runoffType));
        });
    },

    getRunoffTypeValue: function(runoffPartition, runoffType) {
        var depth = runoffPartition[runoffType.name],
            adjustedVolume = this.aoiVolumeModel.adjust(depth);

        return {
            runoffType: runoffType.display,
            // Convert cm depth to standard units
            depth: coreUnits.get('LENGTH_S', depth / 100).value,
            adjustedVolume: coreUnits.get('VOLUME', adjustedVolume).value
        };
    }
});

module.exports = {
    ResultView: ResultView
};
