"use strict";

var Backbone = require('../../../../shim/backbone'),
    GwlfeModificationModel = require('../../models').GwlfeModificationModel,
    WeatherType = require('../../constants').WeatherType;

var WindowModel = Backbone.Model.extend({
    defaults: {
        weather_type: WeatherType.DEFAULT,
        built_in_weather_type: 'MAPSHED',
        custom_weather_output: null,
        custom_weather_errors: [], // Array of String
        custom_weather_file_name: null,
    },

    getOutput: function() {
        var self = this,
            weather_data = function() {
                switch (self.get('weather_type')) {
                    case WeatherType.CUSTOM:
                        return self.get('custom_weather_output') || {};
                    case WeatherType.SIMULATION:
                    // TODO Handle simulation weather types
                    case WeatherType.DEFAULT:
                    default:
                        return {};
                }
            }();

        return new GwlfeModificationModel({
            modKey: 'weather_data',
            output: weather_data,
        });
    },
});

module.exports = {
    WindowModel: WindowModel,
};
