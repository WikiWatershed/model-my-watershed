"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../../../shim/backbone.marionette'),
    App = require('../../../app'),
    resultTmpl = require('./templates/result.html'),
    tableTmpl = require('./templates/table.html'),
    settings = require('../../../core/settings'),
    coreUnits = require('../../../core/units'),
    coreUtils = require('../../../core/utils'),
    modelingUtils = require('../../utils'),
    gwlfeViews = require('../views');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',

    template: resultTmpl,

    ui: {
        tooltip: 'a.model-results-tooltip',
        subbasinResultsLink: '[data-action="view-subbasin-attenuated-results"]',
    },

    events: {
        'click @ui.subbasinResultsLink': 'viewSubbasinResults',
    },

    regions: {
        layerRegion: '.layer-region',
        tableRegion: '.quality-table-region',
    },

    modelEvents: {
        'change': 'onShow'
    },

    templateHelpers: function() {
        var gis_data = this.scenario.getModifiedGwlfeGisData(),
            weather_type = this.scenario.get('weather_type'),
            weather_simulation = this.scenario.get('weather_simulation'),
            weather_custom = this.scenario.get('weather_custom');

        return {
            weather_type: weather_type,
            weather_simulation: weather_simulation,
            weather_custom: modelingUtils.getFileName(weather_custom, '.csv'),
            years: gis_data.WxYrs,
            showSubbasinModelingButton: coreUtils
                .isWKAoIValidForSubbasinModeling(App.currentProject.get('wkaoi')),
        };
    },

    initialize: function(options) {
        this.compareMode = options.compareMode;
        this.scenario = options.scenario;
    },

    onShow: function() {
        var result = this.model.get('result'),
            weather_type = this.scenario.get('weather_type');

        this.layerRegion.show(new gwlfeViews.WeatherStationLayerToggleView({
            weather_type: weather_type
        }));
        this.tableRegion.empty();
        this.activateTooltip();

        if (result && result.Loads) {
            if (!this.compareMode) {
                this.tableRegion.show(new TableView({
                    model: this.model,
                }));
            }
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
    },

    viewSubbasinResults: function() {
        this.options.showSubbasinHotSpotView();
    },
});

var TableView = Marionette.CompositeView.extend({
    template: tableTmpl,

    ui: {
        downloadLoadsCSV: '[data-action="download-csv-granular"]',
        downloadSummaryLoadsCSV: '[data-action="download-csv-summary"]',
        landuseTable: 'table.landuse',
        summaryTable: 'table.summary'
    },

    events: {
        'click @ui.downloadLoadsCSV': 'downloadCSVGranular',
        'click @ui.downloadSummaryLoadsCSV': 'downloadCSVSummary'
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        function makeRow(addUnit, load) {
            var scheme = settings.get('unit_scheme'),
                unit = (function() {
                    switch(load.Unit) {
                        case 'kg/ha':
                            return 'MASSPERAREA_M';
                        case 'mg/l':
                            return 'CONCENTRATION';
                        default:
                            return 'MASS_M';
                    }
                })(),
                unitName = coreUnits[scheme][unit].name,
                source = addUnit ? load.Source + ' (' + unitName + ')' : load.Source;

            return [
                source,
                coreUnits.get(unit, load.Sediment).value,
                coreUnits.get(unit, load.TotalN).value,
                coreUnits.get(unit, load.TotalP).value
            ];
        }

        var scheme = settings.get('unit_scheme'),
            massMUnit = coreUnits[scheme].MASS_M.name,
            massPerAreaMUnit = coreUnits[scheme].MASSPERAREA_M.name,
            concentrationUnit = coreUnits[scheme].CONCENTRATION.name,
            volumeUnit = coreUnits[scheme].VOLUME.name,
            result = this.model.get('result'),
            landUseColumns = [
                'Sources',
                'Sediment (' + massMUnit + ')',
                'Total Nitrogen (' + massMUnit + ')',
                'Total Phosphorus (' + massMUnit + ')'
            ],
            landUseRows = _.map(result.Loads, _.partial(makeRow, false)),
            summaryColumns = ['Sources', 'Sediment', 'Total Nitrogen', 'Total Phosphorus'],
            summaryRows = _.map(result.SummaryLoads, _.partial(makeRow, true));

        return {
            volumeUnit: volumeUnit,
            MeanFlow: coreUnits.get('VOLUME', result.MeanFlow).value,
            MeanFlowPerSecond: coreUnits.get('VOLUME', result.MeanFlowPerSecond).value,
            landUseColumns: landUseColumns,
            landUseRows: landUseRows,
            landUseClassName: 'landuse',
            summaryColumns: summaryColumns,
            summaryRows: summaryRows,
            summaryClassName: 'summary',
            renderPrecision: {
                summaryTable: [
                    {source: 'Total Loads (' + massMUnit + ')', precision: 1},
                    {source: 'Loading Rates (' + massPerAreaMUnit + ')', precision: 2},
                    {source: 'Mean Annual Concentration (' + concentrationUnit + ')', precision: 2},
                    {source: 'Mean Low-Flow Concentration (' + concentrationUnit + ')', precision: 2}],
                landUseTable: [],
            },
            defaultPrecision: {
                summaryTable: 2,
                landUseTable: 1,
            },
        };
    },

    downloadCSVGranular: function() {
        var prefix = 'mapshed_water_quality_loads_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.landuseTable.tableExport({ type: 'csv', fileName: filename });
    },

    downloadCSVSummary: function() {
        var prefix = 'mapshed_water_quality_summary_loads_',
            timestamp = new Date().toISOString(),
            filename = prefix + timestamp;

        this.ui.summaryTable.tableExport({ type: 'csv', fileName: filename });
    }
});

module.exports = {
    TableView: TableView,
    ResultView: ResultView
};
