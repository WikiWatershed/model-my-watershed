"use strict";

var $ = require('jquery'),
    Backbone = require('../../../../shim/backbone'),
    Marionette = require('../../../../shim/backbone.marionette'),
    AoiVolumeModel = require('../models').AoiVolumeModel,
    chart = require('../../../core/chart.js'),
    chartTmpl = require('./templates/chart.html'),
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
        this.tableRegion.empty();
        this.chartRegion.empty();

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

var ChartRowView = Marionette.ItemView.extend({
    template: false,

    className: 'bullet-chart',

    onShow: function() {
        var chartEl = this.$el,
            aoiVolumeModel = this.options.aoiVolumeModel,
            measure = this.model.get('measure'),
            title = measure.substr(0, measure.indexOf(' ')), // First word
            subtitle = measure.substr(measure.indexOf(' ')), // All the rest
            load = this.model.get('load'),
            data = aoiVolumeModel.getLoadingRate(load);

        chart.renderBulletChart(chartEl, title, subtitle, data);
    }
});

var ChartView = Marionette.CompositeView.extend({
    // model ResultModel
    template: chartTmpl,
    className: 'chart-container quality-chart-container',

    childView: ChartRowView,
    childViewContainer: '.bullet-charts',
    childViewOptions: function() {
        return {
            aoiVolumeModel: this.options.aoiVolumeModel
        };
    },
});

module.exports = {
    ResultView: ResultView
};
