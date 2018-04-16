"use strict";

var Backbone = require('../../../../shim/backbone');

var SubbasinTabModel = Backbone.Model.extend({
    defaults: {
        displayName: '',
        name: '',
    },
});

var SubbasinTabCollection = Backbone.Collection.extend({
    model: SubbasinTabModel,
});

module.exports = {
    SubbasinTabModel: SubbasinTabModel,
    SubbasinTabCollection: SubbasinTabCollection,
};
