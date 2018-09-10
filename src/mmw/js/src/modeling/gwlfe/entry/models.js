"use strict";

var Backbone = require('../../../../shim/backbone');

var EntryTabModel = Backbone.Model.extend({
    defaults: {
        displayName: '',
        name: '',
    },
});

var EntryTabCollection = Backbone.Collection.extend({
    model: EntryTabModel,
});

var WindowModel = Backbone.Model.extend({
    defaults: {
        feedbackRequired: true,
        dataModel: null, // Cleaned MapShed GIS Data
        title: '',
        tabs: null,      // EntryTabCollection
    },
});

module.exports = {
    EntryTabCollection: EntryTabCollection,
    EntryTabModel: EntryTabModel,
    WindowModel: WindowModel,
};
