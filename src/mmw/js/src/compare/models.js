"use strict";

var Backbone = require('../../shim/backbone');

var CompareTabModel = Backbone.Model.extend({
    defaults: {
        name: '',
        active: false,
    },
});

var CompareTabsCollection = Backbone.Collection.extend({
    model: CompareTabModel,
});

module.exports = {
    CompareTabModel: CompareTabModel,
    CompareTabsCollection: CompareTabsCollection,
};
