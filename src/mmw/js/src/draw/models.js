"use strict";

var Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette');

var ToolbarModel = Backbone.Model.extend({
    defaults: {
        toolsEnabled: true,
        // Array of { id, name, url } objects.
        predefinedShapeTypes: null
    },

    enableTools: function() {
        this.set('toolsEnabled', true);
    },

    disableTools: function() {
        this.set('toolsEnabled', false);
    }
});

module.exports = {
    ToolbarModel: ToolbarModel
};
