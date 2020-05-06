"use strict";

var Backbone = require('../../../../shim/backbone');

var WindowModel = Backbone.Model.extend({
    defaults: {
        weatherType: 'DEFAULT',
        builtInWeatherType: 'MAPSHED',
    },
});

module.exports = {
    WindowModel: WindowModel,
};
