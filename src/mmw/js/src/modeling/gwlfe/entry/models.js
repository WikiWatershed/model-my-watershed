"use strict";

var Backbone = require('../../../../shim/backbone');

var EntryFieldModel = Backbone.Model.extend({
    defaults: {
        label: '',
        name: '',
        minValue: null,
        maxValue: null,
        autoValue: null,
        userValue: null,
    },

    initialize: function(attrs, dataModel) {
        this.toOutput = attrs.calculator.toOutput;
        this.set('autoValue',
            attrs.calculator.getAutoValue(attrs.name, dataModel));
    },

    toOutput: function() {
        throw "Calculator not provided.";
    }
});

var EntryFieldCollection = Backbone.Collection.extend({
    model: EntryFieldModel,
});

var EntrySectionModel = Backbone.Model.extend({
    defaults: {
        title: '',
        fields: null,  // EntryFieldCollection
    }
});

var EntrySectionCollection = Backbone.Collection.extend({
    model: EntrySectionModel,
});

var EntryTabModel = Backbone.Model.extend({
    defaults: {
        displayName: '',
        name: '',
        sections: null,  // EntrySectionCollection
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
    EntryFieldModel: EntryFieldModel,
    EntryFieldCollection: EntryFieldCollection,
    EntrySectionModel: EntrySectionModel,
    EntrySectionCollection: EntrySectionCollection,
    EntryTabCollection: EntryTabCollection,
    EntryTabModel: EntryTabModel,
    WindowModel: WindowModel,
};
