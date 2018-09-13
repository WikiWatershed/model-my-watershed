"use strict";

var Backbone = require('../../../../shim/backbone'),
    GwlfeModificationModel = require('../../models').GwlfeModificationModel;

var ENTRY_FIELD_TYPES = {
    NUMERIC: 'NUMERIC',
    YESNO: 'YESNO',
};

var EntryFieldModel = Backbone.Model.extend({
    defaults: {
        label: '',
        name: '',
        type: ENTRY_FIELD_TYPES.NUMERIC,
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

    getOutput: function() {
        var output = {},
            userInput = {};

        this.get('sections').forEach(function(section) {
            section.get('fields').forEach(function(field) {
                var name = field.get('name'),
                    userValue = field.get('userValue');

                if (userValue !== null &&
                    userValue !== undefined &&
                    userValue !== '') {
                    output[name] = field.toOutput(userValue);
                    userInput[name] = userValue;
                }
            });
        });

        return new GwlfeModificationModel({
            modKey: 'entry_' + this.get('name'),
            output: output,
            userInput: userInput,
        });
    }
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

/**
 * Returns a FieldCollection for a section
 * @param tabName  Name of the tab
 * @param dataModel  Project's gis_data, cleaned
 * @param modifications  Scenario's current modification collection
 * @param fields  Object with {name, label, calculator} for each field, with
 *                minValue and maxValue optionally specified
 * @returns A FieldCollection with specified fields
 */
function makeFieldCollection(tabName, dataModel, modifications, fields) {
    var mods = modifications.findWhere({ modKey: 'entry_' + tabName }),
        userInput = mods ? mods.get('userInput') : {};

    return new EntryFieldCollection(fields.map(function(fieldInfo) {
        var field = new EntryFieldModel(fieldInfo, dataModel);

        if (userInput.hasOwnProperty(fieldInfo.name)) {
            field.set('userValue', userInput[fieldInfo.name]);
        }

        return field;
    }));
}

module.exports = {
    ENTRY_FIELD_TYPES: ENTRY_FIELD_TYPES,
    EntryFieldModel: EntryFieldModel,
    EntryFieldCollection: EntryFieldCollection,
    EntrySectionModel: EntrySectionModel,
    EntrySectionCollection: EntrySectionCollection,
    EntryTabCollection: EntryTabCollection,
    EntryTabModel: EntryTabModel,
    WindowModel: WindowModel,
    makeFieldCollection: makeFieldCollection,
};
