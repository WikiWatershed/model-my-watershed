"use strict";

var L = require('leaflet'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    weatherStationPopupTmpl = require('./templates/weatherStationPopup.html');

var inactiveWeatherStationStyle = {
    fill: true,
    color: '#3388ff',
    fillColor: 'steelblue',
    fillOpacity: 0.2,
    radius: 10,
    weight: 3
};

var activeWeatherStationStyle = {
    fill: true,
    color: '#ff7800',
    fillColor: '#ff7800',
    fillOpacity: 0.5,
    radius: 15,
    weight: 5
};

var bindPopup = function(marker, feature, isActive) {
    var view = new WeatherStationPopupView({ model: new Backbone.Model(feature.properties),
                                             isActive: isActive });
    marker.unbindPopup();
    marker.bindPopup(view.render().el, { className: 'data-catalog-popover'});
};

var Layer = {
    createLayer: function(geojsonFeatureCollection) {
        // If there is an active MapShed modeling project,
        // we need to highlight the weather stations that were
        // used in the model.
        return L.geoJson(geojsonFeatureCollection, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, inactiveWeatherStationStyle);
            },

            onEachFeature: function(feature, marker) {
                bindPopup(marker, feature, false);
            }
        });
    },

    // Highlights the active weather stations in this layer, and returns
    // a list of point geometries that represent the active weather stations.
    setActiveWeatherStations: function(layer, activeWeatherStations) {
        var activePoints = [];
        layer.eachLayer(function(point) {
            var props = point.feature.properties;
            if(props.station in activeWeatherStations) {
                activePoints.push(point.feature.geometry);
                var ws = activeWeatherStations[props.station];
                props.distanceToProjectAoi = (ws.distance / 1000.0).toFixed(2); // Use KM.
                point.setStyle(activeWeatherStationStyle);
                bindPopup(point, point.feature, true);
            }
        });
        return activePoints;
    },

    clearActiveWeatherStations: function(layer, activeWeatherStations) {
        layer.eachLayer(function(point) {
            var props = point.feature.properties;
            if(props.station in activeWeatherStations) {
                delete props.distanceToProjectAoi;
                point.setStyle(inactiveWeatherStationStyle);
                bindPopup(point, point.feature, false);
            }
        });
    }
};

var WeatherStationPopupView = Marionette.ItemView.extend({
    template: weatherStationPopupTmpl,
    className: 'weather-station-popup',

    initialize: function(options) {
        this.isActive = options.isActive;
    },

    templateHelpers: function() {
        return {
            isActive: this.isActive
        };
    }
});

module.exports.Layer = Layer;
