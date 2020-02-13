"use strict";

var L = require('leaflet'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    weatherStationPopupTmpl = require('./templates/weatherStationPopup.html');

var Layer = {
    createLayer: function(geojsonFeatureCollection) {
        return L.geoJson(geojsonFeatureCollection, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    fill: true,
                    fillColor: 'steelblue',
                    fillOpacity: 0.2
                });
            },

            onEachFeature: function(feature, marker) {
                var model = new Backbone.Model(feature.properties),
                    view = new WeatherStationPopupView({ model: model });

                marker.bindPopup(view.render().el, { className: 'data-catalog-popover'});
            },
        });
    }
};

var WeatherStationPopupView = Marionette.ItemView.extend({
    template: weatherStationPopupTmpl,
    className: 'weather-station-popup',
});

module.exports.Layer = Layer;
