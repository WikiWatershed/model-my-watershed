"use strict";

var Marionette = require('../../../shim/backbone.marionette'),
    App = require('../../app'),
    weatherStationLayerToggleTmpl = require('./templates/weatherStationLayerToggle.html');

var WeatherStationLayerToggleView = Marionette.ItemView.extend({
    template: weatherStationLayerToggleTmpl,

    ui: {
        'toggleButton': '.analyze-layertoggle',
        helptextIcon: 'a.help',
    },

    events: {
        'click @ui.toggleButton': 'toggleLayer',
    },

    initialize: function(options) {
        var self = this;

        self.mergeOptions(options, 'weather_type');

        self.layerGroup = App.getLayerTabCollection().getObservationLayerGroup();
        self.layerGroup.getWeatherStationLayer()
            .done(function(layer) {
                self.model = layer;
                if (self.model) {
                    self.model.on('change:active change:disabled', self.renderIfNotDestroyed, self);
                    self.renderIfNotDestroyed();
                }
            });
    },

    renderIfNotDestroyed: function() {
        if (!this.isDestroyed) {
            this.render();
            this.ui.helptextIcon.popover({
                placement: 'right',
                trigger: 'focus'
            });
        }
    },

    setMessage: function() {
        var polling = this.layerGroup.get('polling'),
            error = this.layerGroup.get('error');
        if (polling) {
            this.message = 'Loading related layers...';
        } else if (error) {
            this.message = error;
        }
    },

    toggleLayer: function() {
        var layer = this.model;

        if(layer) {
            var layerTabCollection = App.getLayerTabCollection(),
                layerGroup = layerTabCollection.findLayerGroup(layer.get('layerType'));

            layer.toggleAndZoom(App.map.get('areaOfInterest'), App.getLeafletMap(), layerGroup);
        }
    },

    templateHelpers: function() {
        var helpers = {
            weather_type: this.weather_type,
        };

        if (this.message) {
            helpers.message = this.message;
        }
        else if (this.model) {
            helpers.isLayerOn = this.model.get('active');
        }

        return helpers;
    },
});

module.exports = {
    WeatherStationLayerToggleView: WeatherStationLayerToggleView
};
