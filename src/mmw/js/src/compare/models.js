"use strict";

var _ = require('lodash'),
    coreUtils = require('../core/utils'),
    settings = require('../core/settings'),
    coreUnits = require('../core/units'),
    Backbone = require('../../shim/backbone'),
    ControlsCollection = require('../modeling/models').ModelPackageControlsCollection,
    constants = require('./constants');

var SelectionOptionModel = Backbone.Model.extend({
    defaults: {
        group: '',
        value: '',
        name: '',
        active: false,
    },

    initialize: function(attrs) {
        // Default value to name, unless specified otherwise
        if (attrs.value === undefined) {
            this.set('value', attrs.name);
        }
    }
});

var SelectionOptionsCollection = Backbone.Collection.extend({
    model: SelectionOptionModel,
});

var LineChartRowModel = Backbone.Model.extend({
    defaults: {
        key: '',
        name: '',
        chartDiv: '',
        data: [],
        scenarioNames: [],
    },
});

var LineChartRowsCollection = Backbone.Collection.extend({
    model: LineChartRowModel,
});

var MonthlyTableRowModel = Backbone.Model.extend({
    defaults: {
        key: '',
        name: '',
        values: [],
        unit: '',
        selectedAttribute: '',
    },
});

var MonthlyTableRowsCollection = Backbone.Collection.extend({
    model: MonthlyTableRowModel,
});

var BarChartRowModel = Backbone.Model.extend({
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

var BarChartRowsCollection = Backbone.Collection.extend({
    model: BarChartRowModel,

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

var GwlfeHydrologyCharts = LineChartRowsCollection.extend();

var GwlfeHydrologyTable = MonthlyTableRowsCollection.extend({
    update: function(selection) {
        this.invoke('set', {
            selectedAttribute: selection.get('value'),
        });
    }
});

var Tr55RunoffCharts = BarChartRowsCollection.extend({
    update: function() {
        var precipitationInput = this.scenarios.first()
                                               .get('inputs')
                                               .findWhere({ name: 'precipitation' }),
            precipitationMeters = precipitationInput.get('value') * coreUnits.CONVERSIONS.CM_PER_IN / 100,
            results = this.scenarios.map(coreUtils.getTR55RunoffResult, coreUtils);

        this.forEach(function(chart) {
            var key = chart.get('key'),
                values = [];

            if (key === 'combined') {
                values = results;
            } else {
                values = _.map(results, function(result) {
                    return result[key] / 100; // Convert cm to m
                });
            }

            chart.set({
                precipitation: precipitationMeters,
                values: values
            });
        });
    }
});

var Tr55QualityCharts = BarChartRowsCollection.extend({
    update: function() {
        var aoivm = this.aoiVolumeModel,
            results = this.scenarios.map(coreUtils.getTR55WaterQualityResult, coreUtils);

        this.forEach(function(chart) {
            var name = chart.get('name'),
                values = _.map(results, function(result) {
                    var load = _.find(result, { measure: name }).load;

                    return aoivm.getLoadingRate(load);
                });

            chart.set({
                values: values,
            });
        });
    }
});

var GwlfeQualityCharts = BarChartRowsCollection.extend({
    update: function(selection) {
        var results = this.scenarios.map(function(scenario) {
            return {
                name: scenario.get('name'),
                result: scenario.get('results')
                    .findWhere({ name: 'quality' })
                    .get('result'),
            };
        });

        this.forEach(function(chart) {
            var scheme = settings.get('unit_scheme'),
                key = chart.get('key'),
                group = selection.get('group'),
                source = selection.get('value'),
                unit = selection.get('unit'),
                unitName = coreUnits[scheme][unit].name,
                unitLabel = selection.get('name'),
                values = _.map(results, function(r) {
                    return {
                        x: r.name,
                        y: coreUnits.get(unit, Number(
                            _.find(
                                r.result[group],
                                { Source: source }
                            )[key]
                        )).value,
                    };
                });

            chart.set({
                unit: unitName,
                unitLabel: unitLabel,
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
        var scheme = settings.get('unit_scheme'),
            unit = coreUnits[scheme].LENGTH_S.name,
            get = function(key) {
                return function(result) {
                    return coreUnits.get('LENGTH_S', result[key] / 100).value;
                };
            },
            results = this.scenarios.map(coreUtils.getTR55RunoffResult, coreUtils),
            runoff = _.map(results, get('runoff')),
            et     = _.map(results, get('et'    )),
            inf    = _.map(results, get('inf'   )),
            rows   = [
                { name: "Runoff"            , unit: unit, values: runoff },
                { name: "Evapotranspiration", unit: unit, values: et     },
                { name: "Infiltration"      , unit: unit, values: inf    },
            ];

        this.reset(rows);
    }
});

var Tr55QualityTable = TableRowsCollection.extend({
    update: function() {
        var scheme = settings.get('unit_scheme'),
            unit = coreUnits[scheme].MASSPERAREA_M.name,
            aoivm = this.aoiVolumeModel,
            results = this.scenarios.map(coreUtils.getTR55WaterQualityResult, coreUtils),
            get = function(key) {
                return function(result) {
                    var load = _.find(result, { measure: key }).load;

                    return coreUnits.get(
                        'MASSPERAREA_M',
                        aoivm.getLoadingRate(load)
                    ).value;
                };
            },
            tss  = _.map(results, get('Total Suspended Solids')),
            tn   = _.map(results, get('Total Nitrogen')),
            tp   = _.map(results, get('Total Phosphorus')),
            rows = [
                { name: "Total Suspended Solids", unit: unit, values: tss },
                { name: "Total Nitrogen"        , unit: unit, values: tn  },
                { name: "Total Phosphorus"      , unit: unit, values: tp  },
            ];

        this.reset(rows);
    }
});

var GwlfeQualityTable = TableRowsCollection.extend({
    update: function(selection) {
        var results = this.scenarios.map(function(scenario) {
                return scenario.get('results')
                    .findWhere({ name: 'quality' })
                    .get('result');
            }),
            group = selection.get('group'),
            source = selection.get('value'),
            unit = selection.get('unit'),
            get = function(key) {
                return function(result) {
                    return Number(
                        _.find(result[group], { Source: source })[key]);
                };
            },
            ss = _.map(results, get('Sediment')),
            tn = _.map(results, get('TotalN')),
            tp = _.map(results, get('TotalP')),
            rows = [
                { name: 'Sediment'        , unit: unit, values: ss },
                { name: 'Total Nitrogen'  , unit: unit, values: tn },
                { name: 'Total Phosphorus', unit: unit, values: tp },
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
        selections: null, // SelectionOptionsCollection
    },
});

var TabsCollection = Backbone.Collection.extend({
    model: TabModel,
});

var WindowModel = Backbone.Model.extend({
    defaults: {
        controls: null, // ModelPackageControlsCollection
        mode: constants.CHARTS, // or TABLE
        scenarios: null, // ScenariosCollection
        tabs: null,  // TabsCollection
        visibleScenarioIndex: 0, // Index of the first visible scenario
        polling: false,  // If any results are polling
        projectName: null,
        modelPackage: coreUtils.TR55_PACKAGE,
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
    SelectionOptionModel: SelectionOptionModel,
    SelectionOptionsCollection: SelectionOptionsCollection,
    ControlsCollection: ControlsCollection,
    BarChartRowModel: BarChartRowModel,
    LineChartRowModel: LineChartRowModel,
    GwlfeHydrologyCharts: GwlfeHydrologyCharts,
    GwlfeHydrologyTable: GwlfeHydrologyTable,
    Tr55QualityTable: Tr55QualityTable,
    Tr55QualityCharts: Tr55QualityCharts,
    Tr55RunoffTable: Tr55RunoffTable,
    Tr55RunoffCharts: Tr55RunoffCharts,
    GwlfeQualityCharts: GwlfeQualityCharts,
    GwlfeQualityTable: GwlfeQualityTable,
    TabsCollection: TabsCollection,
    WindowModel: WindowModel,
};
