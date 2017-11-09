"use strict";

var $ = require('jquery'),
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

    ui: {
        downloadCSV: '[data-action="download-csv"]',
        table: '.quality-table-region'
    },

    events: {
        'click @ui.downloadCSV': 'downloadCSV'
    },

    modelEvents: {
        'change': 'onShow'
    },

    initialize: function(options) {
        this.scenario = options.scenario;

        this.aoiVolumeModel = new AoiVolumeModel({
            areaOfInterest: this.options.areaOfInterest
        });
    },

    onShow: function() {
        this.tableRegion.reset();
        this.chartRegion.reset();
        if (this.model.get('result')) {
            var dataCollection = new Backbone.Collection(
                this.model.get('result').quality['modified'].filter(
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
    },

    downloadCSV: function() {
        var prefix = 'tr55_water_quality_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.table.tableExport({ type: 'csv', fileName: filename });
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
    // model ResultModel
    template: barChartTmpl,
    className: 'chart-container quality-chart-container',

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

module.exports = {
    ResultView: ResultView
};
