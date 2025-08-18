"use strict";

var $ = require('jquery'),
    Backbone = require('../../../../shim/backbone'),
    GwlfeModificationModel = require('../../models').GwlfeModificationModel,
    WeatherType = require('../../constants').WeatherType;

var WindowModel = Backbone.Model.extend({
    defaults: {
        project_id: null, // Must be specified
        in_drb: false,
        in_drwi: false,
        in_pa: false,
        scenario_id: null, // Must be specified
        weather_type: WeatherType.DEFAULT,
        available_data: 'DEFAULT',
        simulation_weather_output: null,
        simulation_weather_errors: [], // Array of String
        simulation_weather_category: null,
        custom_weather_output: null,
        custom_weather_errors: [], // Array of String
        custom_weather_file_name: null,
    },

    validate: function(attrs) {
        if (attrs.weather_type === WeatherType.SIMULATION) {
            if (attrs.simulation_weather_output === null) {
                return 'Simulation Weather cannot have empty output';
            }

            if (attrs.simulation_weather_errors.length > 0) {
                return 'Simulation Weather has errors';
            }
        }

        if (attrs.weather_type === WeatherType.CUSTOM) {
            if (attrs.custom_weather_output === null) {
                return 'Custom Weather cannot have empty output';
            }

            if (attrs.custom_weather_errors.length > 0) {
                return 'Custom Weather has errors';
            }
        }
    },

    fetchSimulationWeather: function() {
        var self = this,
            project_id = this.get('project_id'),
            category = this.get('available_data'),
            url = '/mmw/modeling/projects/' + project_id + '/weather/' + category;

        return $.ajax({
            url: url,
            type: 'GET',
            cache: true,
        }).then(function(data) {
            self.set({
                simulation_weather_output: data.output,
                simulation_weather_errors: data.errors || [],
                simulation_weather_category: category,
            });
        }).catch(function(err) {
            var errors = err && err.responseJSON && err.responseJSON.errors;

            if (err.status === 403) {
                if (errors) {
                    errors.push('Available weather file not found.');
                } else {
                    errors = ['Available weather file not found.'];
                }
            }

            self.set({
                simulation_weather_output: null,
                simulation_weather_errors: errors || ['Unknown server error.'],
                simulation_weather_category: category,
            });
        });
    },

    fetchSimulationWeatherIfNeeded: function() {
        var self = this,
            weather_type = this.get('weather_type'),
            available_data = this.get('available_data'),
            simulation_weather_output = this.get('simulation_weather_output'),
            simulation_weather_category = this.get('simulation_weather_category'),
            needsSimulationWeather =
                weather_type === WeatherType.SIMULATION && (
                    available_data !== simulation_weather_category || (
                        available_data === simulation_weather_category &&
                        simulation_weather_output === null
                )
            );

        if (needsSimulationWeather && this.fetchSimulationWeatherPromise === undefined) {
            this.fetchSimulationWeatherPromise = this.fetchSimulationWeather();
            this.fetchSimulationWeatherPromise.always(function() {
                delete self.fetchSimulationWeatherPromise;
            });
        }

        return this.fetchSimulationWeatherPromise || $.when();
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
        }).catch(function(err) {
            var errors = err && err.responseJSON && err.responseJSON.errors;

            if (err.status === 404) {
                if (errors) {
                    errors.push('Custom weather file not found.');
                } else {
                    errors = ['Custom weather file not found.'];
                }
            }

            self.set({
                custom_weather_output: null,
                custom_weather_errors: errors || ['Unknown server error.'],
                custom_weather_file_name: null,
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
            available_data = this.get('available_data'),
            switchToDefault = available_data === WeatherType.DEFAULT,
            scenario_id = this.get('scenario_id'),
            url = '/mmw/modeling/scenarios/' + scenario_id + '/custom-weather-data/';

        return $.ajax({
            url: url,
            method: 'DELETE',
        }).then(function() {
            self.set({
                weather_type: switchToDefault ? WeatherType.DEFAULT : WeatherType.SIMULATION,
                custom_weather_output: null,
                custom_weather_errors: [], // Array of String
                custom_weather_file_name: null,
            });
        }).catch(function(err) {
            var errors = err && err.responseJSON && err.responseJSON.errors;

            self.set({
                custom_weather_errors: errors || ['Unknown server error.'],
            });
        });
    },

    fetchWeatherIfNeeded: function() {
        var self = this;

        if (this.fetchWeatherPromise === undefined) {
            this.fetchWeatherPromise = $.when(
                this.fetchSimulationWeatherIfNeeded(),
                this.fetchCustomWeatherIfNeeded()
            );
            this.fetchWeatherPromise.always(function() {
                delete self.fetchWeatherPromise;
            });
        }

        return this.fetchWeatherPromise || $.when();
    },

    getOutput: function() {
        var self = this,
            weather_data = function() {
                switch (self.get('weather_type')) {
                    case WeatherType.CUSTOM:
                        return self.get('custom_weather_output') || {};
                    case WeatherType.SIMULATION:
                        return self.get('simulation_weather_output') || {};
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
