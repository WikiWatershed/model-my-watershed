"use strict";

var _ = require('lodash'),
    coreUtils = require('../core/utils'),
    Backbone = require('../../shim/backbone'),
    ControlsCollection = require('../modeling/models').ModelPackageControlsCollection;

var CHART = 'chart',
    TABLE = 'table',
    MIN_VISIBLE_SCENARIOS = 5,
    CHART_AXIS_WIDTH = 82,
    COMPARE_COLUMN_WIDTH = 134;

var ChartRowModel = Backbone.Model.extend({
    defaults: {
        key: '',
        name: '',
        chartDiv: '',
        seriesColors: [],
        legendItems: null,
        values: [],
        unit: '',
        unitLabel: '',
        precipitation: null,
    },
});

var ChartRowsCollection = Backbone.Collection.extend({
    model: ChartRowModel,

    /**
     * Initialize collection by storing the given scenario collection
     * and listening to updates to scenario results. Each change fires
     * an `update` function, which should be defined in the descendants
     * of this collection.
     */
    initialize: function(models, options) {
        var update = _.bind(this.update, this);

        this.scenarios = options.scenarios;
        this.aoiVolumeModel = options.aoiVolumeModel;

        this.scenarios.forEach(function(scenario) {
            scenario.get('results').on('change', update);
        });
    }
});

var Tr55RunoffCharts = ChartRowsCollection.extend({
    update: function() {
        var precipitationInput = this.scenarios.first()
                                               .get('inputs')
                                               .findWhere({ name: 'precipitation' }),
            precipitation = coreUtils.convertToMetric(precipitationInput.get('value'), 'in'),
            results = this.scenarios.map(function(scenario) {
                return scenario.get('results')
                               .findWhere({ name: 'runoff' })
                               .get('result');
            });

        this.forEach(function(chart) {
            var key = chart.get('key'),
                values = [];

            if (key === 'combined') {
                values = _.map(results, function(result) {
                    return result.runoff.modified;
                });
            } else {
                values = _.map(results, function(result) {
                    return result.runoff.modified[key];
                });
            }

            chart.set({
                precipitation: precipitation,
                values: values
            });
        });
    }
});

var Tr55QualityCharts = ChartRowsCollection.extend({
    update: function() {
        var aoivm = this.aoiVolumeModel,
            results = this.scenarios.map(function(scenario) {
                return scenario.get('results')
                               .findWhere({ name: 'quality' })
                               .get('result');
            });

        this.forEach(function(chart) {
            var name = chart.get('name'),
                values = _.map(results, function(result) {
                    var measures = result.quality.modified,
                        load = _.find(measures, { measure: name }).load;

                    return aoivm.getLoadingRate(load);
                });

            chart.set({
                values: values,
            });
        });
    }
});

var TableRowModel = Backbone.Model.extend({
    defaults: {
        name: '',
        values: [],
        unit: '',
    },
});

var TableRowsCollection = Backbone.Collection.extend({
    model: TableRowModel,

    /**
     * Initialize collection by storing the given scenario collection
     * and listening to updates to scenario results. Each change fires
     * an `update` function, which should be defined in the descendants
     * of this collection.
     */
    initialize: function(attrs) {
        var update = _.bind(this.update, this);

        this.scenarios = attrs.scenarios;
        this.aoiVolumeModel = attrs.aoiVolumeModel;

        this.scenarios.forEach(function(scenario) {
            scenario.get('results').on('change', update);
        });
    }
});

var Tr55RunoffTable = TableRowsCollection.extend({
    update: function() {
        var results = this.scenarios.map(function(scenario) {
                return scenario.get('results')
                               .findWhere({ name: 'runoff' })
                               .get('result');
            }),
            get = function(key) {
                return function(result) {
                    return result.runoff.modified[key];
                };
            },
            runoff = _.map(results, get('runoff')),
            et     = _.map(results, get('et'    )),
            inf    = _.map(results, get('inf'   )),
            rows   = [
                { name: "Runoff"            , unit: "cm", values: runoff },
                { name: "Evapotranspiration", unit: "cm", values: et     },
                { name: "Infiltration"      , unit: "cm", values: inf    },
            ];

        this.reset(rows);
    }
});

var Tr55QualityTable = TableRowsCollection.extend({
    update: function() {
        var aoivm = this.aoiVolumeModel,
            results = this.scenarios.map(function(scenario) {
                return scenario.get('results')
                               .findWhere({ name: 'quality' })
                               .get('result');
            }),
            get = function(key) {
                return function(result) {
                    var measures = result.quality.modified,
                        load = _.find(measures, { measure: key }).load;

                    return aoivm.getLoadingRate(load);
                };
            },
            tss  = _.map(results, get('Total Suspended Solids')),
            tn   = _.map(results, get('Total Nitrogen')),
            tp   = _.map(results, get('Total Phosphorus')),
            rows = [
                { name: "Total Suspended Solids", unit: "kg/ha", values: tss },
                { name: "Total Nitrogen"        , unit: "kg/ha", values: tn  },
                { name: "Total Phosphorus"      , unit: "kg/ha", values: tp  },
            ];

        this.reset(rows);
    }
});

var TabModel = Backbone.Model.extend({
    defaults: {
        name: '',
        active: false,
        table: null,  // TableRowsCollection
        charts: null, // ChartRowCollection
    },
});

var TabsCollection = Backbone.Collection.extend({
    model: TabModel,
});

var WindowModel = Backbone.Model.extend({
    defaults: {
        controls: null, // ModelPackageControlsCollection
        mode: CHART, // or TABLE
        scenarios: null, // ScenariosCollection
        tabs: null,  // TabsCollection
        visibleScenarioIndex: 0, // Index of the first visible scenario
        polling: false,  // If any results are polling
    },

    initialize: function() {
        var setPolling = _.bind(this.setPolling, this);

        this.get('scenarios').forEach(function(scenario) {
            scenario.get('results').on('change', setPolling);
        });
    },

    setPolling: function() {
        var getPolling = function(scenario) {
                return scenario.get('results').pluck('polling');
            },
            scenarios = this.get('scenarios'),
            polling = _(scenarios.map(getPolling)).flatten().some();

        this.set({ polling: polling });
    },

    addOrReplaceInput: function(input) {
        this.get('scenarios').each(function(scenario) {
            scenario.addOrReplaceInput(input);
        });
    }
});

module.exports = {
    ControlsCollection: ControlsCollection,
    ChartRowModel: ChartRowModel,
    Tr55QualityTable: Tr55QualityTable,
    Tr55QualityCharts: Tr55QualityCharts,
    Tr55RunoffTable: Tr55RunoffTable,
    Tr55RunoffCharts: Tr55RunoffCharts,
    TabsCollection: TabsCollection,
    WindowModel: WindowModel,
    constants: {
        CHART: CHART,
        TABLE: TABLE,
        MIN_VISIBLE_SCENARIOS: MIN_VISIBLE_SCENARIOS,
        CHART_AXIS_WIDTH: CHART_AXIS_WIDTH,
        COMPARE_COLUMN_WIDTH: COMPARE_COLUMN_WIDTH,
    },
};
