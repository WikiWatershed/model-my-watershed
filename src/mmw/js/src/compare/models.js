"use strict";

var Backbone = require('../../shim/backbone'),
    ControlsCollection = require('../modeling/models').ModelPackageControlsCollection;

var CHART = 'chart',
    TABLE = 'table';

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
    },

    initialize: function(attrs) {
        Backbone.Model.prototype.initialize.apply(this, arguments);

        this.set({
            table: new TableRowsCollection(attrs.table),
        });
    },
});

var TabsCollection = Backbone.Collection.extend({
    model: TabModel,
});

var WindowModel = Backbone.Model.extend({
    defaults: {
        controls: null, // ModelPackageControlsCollection
        mode: TABLE, // or CHART
        scenarios: null, // ScenariosCollection
        tabs: null,  // TabsCollection
    },

    initialize: function(attrs) {
        Backbone.Model.prototype.initialize.apply(this, arguments);

        this.set({
            controls: new ControlsCollection(attrs.controls),
            tabs: new TabsCollection(attrs.tabs),
        });
    }
});

module.exports = {
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
