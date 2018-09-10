"use strict";

var Backbone = require('../../../../shim/backbone');

var WindowModel = Backbone.Model.extend({
    defaults: {
        feedbackRequired: true,
        dataModel: null, // Cleaned MapShed GIS Data
        title: '',
    },
});

module.exports = {
    WindowModel: WindowModel,
};
