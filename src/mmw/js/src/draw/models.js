"use strict";

var Backbone = require('../../shim/backbone'),
    _ = require('jquery'),
    settings = require('../core/settings'),
    coreModels = require('../core/models');

var ToolbarModel = Backbone.Model.extend({
    defaults: {
        // Array of { endpoint, tableId, display } objects.
        predefinedShapeTypes: null,
        outlineFeatureGroup: null,
        polling: false,
        pollError: false,
        activeDrawTool: null,
        activeDrawToolItem: null,
        openDrawTool: null
    },

    reset: function() {
        this.set({
            activeDrawTool: null,
            activeDrawToolItem: null,
            polling: false,
            pollError: false
        });
    },

    openDrawTool: function(drawTool) {
        this.set('openDrawTool', drawTool);
    },

    closeDrawTool: function() {
        this.set('openDrawTool', null);
    },

    selectDrawToolItem: function(drawTool, drawToolItem) {
        this.set({
            activeDrawTool: drawTool,
            activeDrawToolItem: drawToolItem
        });
        this.closeDrawTool();
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
            taskName: 'watershed',
            taskType: 'api',
            token: settings.get('api_token')
        }, coreModels.TaskModel.prototype.defaults
    )
});

module.exports = {
    ToolbarModel: ToolbarModel,
    RwdTaskModel: RwdTaskModel
};
