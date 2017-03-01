"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('jquery'),
    coreModels = require('../core/models');

var ToolbarModel = Backbone.Model.extend({
    defaults: {
        toolsEnabled: true,
        // Array of { endpoint, tableId, display } objects.
        predefinedShapeTypes: null,
        outlineFeatureGroup: null,
        polling: false,
        pollError: false
    },

    enableTools: function() {
        this.set('toolsEnabled', true);
    },

    disableTools: function() {
        this.set('toolsEnabled', false);
    },

    clearRwdClickedPoint: function(map) {
        if (map && this.has('rwd-original-point')) {
            map.removeLayer(this.get('rwd-original-point'));
            this.unset('rwd-original-point');
        }
    }
});

// Used for running Rapid Watershed Delineation tasks.
var RwdTaskModel = coreModels.TaskModel.extend({
    defaults: _.extend( {
            taskName: 'rwd',
            taskType: 'modeling'
        }, coreModels.TaskModel.prototype.defaults
    )
});

module.exports = {
    ToolbarModel: ToolbarModel,
    RwdTaskModel: RwdTaskModel
};
