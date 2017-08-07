"use strict";

var Backbone = require('../../shim/backbone'),
    ControlsCollection = require('../modeling/models').ModelPackageControlsCollection;

var CHART = 'chart',
    TABLE = 'table';

var ChartRowModel = Backbone.Model.extend({
    defaults: {
        name: '',
        chartDiv: '',
        seriesColors: [],
        legendItems: null,
        values: [],
        unit: '',
        precipitation: null,
    },
});

var ChartRowsCollection = Backbone.Collection.extend({
    model: ChartRowModel,
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
});

var TabModel = Backbone.Model.extend({
    defaults: {
        name: '',
        active: false,
        table: null,  // TableRowsCollection
        charts: null, // ChartRowCollection
    },

    initialize: function(attrs) {
        Backbone.Model.prototype.initialize.apply(this, arguments);

        this.set({
            table: new TableRowsCollection(attrs.table),
            charts: new ChartRowsCollection(attrs.charts),
        });
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
    },

    initialize: function(attrs) {
        Backbone.Model.prototype.initialize.apply(this, arguments);

        this.set({
            controls: new ControlsCollection(attrs.controls),
            tabs: new TabsCollection(attrs.tabs),
            scenarios: attrs.scenarios,
        });
    },

    addOrReplaceInput: function(input) {
        this.get('scenarios').each(function(scenario) {
            scenario.addOrReplaceInput(input);
        });
    }
});

module.exports = {
    ChartRowModel: ChartRowModel,
    ChartRowsCollection: ChartRowsCollection,
    TableRowModel: TableRowModel,
    TableRowsCollection: TableRowsCollection,
    TabModel: TabModel,
    TabsCollection: TabsCollection,
    WindowModel: WindowModel,
    constants: {
        CHART: CHART,
        TABLE: TABLE,
    },
};
