"use strict";

var $ = require('jquery'),
    Backbone = require('../../../../shim/backbone'),
    GwlfeModificationModel = require('../../models').GwlfeModificationModel,
    WeatherType = require('../../constants').WeatherType;

var WindowModel = Backbone.Model.extend({
    defaults: {
        scenario_id: null, // Must be specified
        weather_type: WeatherType.DEFAULT,
        built_in_weather_type: 'MAPSHED',
        custom_weather_output: null,
        custom_weather_errors: [], // Array of String
        custom_weather_file_name: null,
    },

    postCustomWeather: function(formData) {
        var self = this,
            scenario_id = this.get('scenario_id'),
            url = '/mmw/modeling/scenarios/' + scenario_id + '/custom-weather-data/';

        return $.ajax({
            url: url,
            type: 'POST',
            data: formData,

            // Necessary options for file uploads
            cache: false,
            contentType: false,
            processData: false,
        }).then(function(data) {
            self.set({
                custom_weather_file_name: data.file_name,
                custom_weather_output: data.output,
                custom_weather_errors: [],
            });
        }).catch(function(err) {
            var errors = err && err.responseJSON && err.responseJSON.errors;

            self.set({
                custom_weather_output: null,
                custom_weather_errors: errors || ['Unknown server error.'],
            });
        });
    },

    fetchCustomWeather: function() {
        var self = this,
            scenario_id = this.get('scenario_id'),
            url = '/mmw/modeling/scenarios/' + scenario_id + '/custom-weather-data/';

        return $.get(url).then(function(data) {
            self.set({
                custom_weather_output: data.output,
                custom_weather_file_name: data.file_name,
                custom_weather_errors: data.errors || [],
            });
        });
    },

    fetchCustomWeatherIfNeeded: function() {
        var self = this,
            custom_weather_file_name = this.get('custom_weather_file_name'),
            weather_type = this.get('weather_type'),
            needsCustomWeather =
                custom_weather_file_name &&
                weather_type !== WeatherType.CUSTOM;

        if (needsCustomWeather && this.fetchCustomWeatherPromise === undefined) {
            this.fetchCustomWeatherPromise = this.fetchCustomWeather();
            this.fetchCustomWeatherPromise.always(function () {
                delete self.fetchCustomWeatherPromise;
            });
        }

        return this.fetchCustomWeatherPromise || $.when();
    },

    deleteCustomWeather: function() {
        var self = this,
            scenario_id = this.get('scenario_id'),
            url = '/mmw/modeling/scenarios/' + scenario_id + '/custom-weather-data/';

        return $.ajax({
            url: url,
            method: 'DELETE',
        }).then(function() {
            self.set({
                weather_type: WeatherType.DEFAULT,
                custom_weather_output: null,
                custom_weather_errors: [], // Array of String
                custom_weather_file_name: null,
            });
        });
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
