"use strict";

var L = require('leaflet'),
    $ = require('jquery'),
    utils = require('./utils'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    pointSourcePopupTmpl = require('./templates/pointSourcePopup.html');

// Increase or decrease the marker size based on the map zoom level
var markerSizesForZoomLevels = [0.05, 0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.25, 1.75,
    2, 2.25, 3, 6, 8, 10, 10, 10, 10, 10];

module.exports = {
    createLayer: function(geojsonFeatureCollection, leafletMap) {
        return L.geoJson($.parseJSON(geojsonFeatureCollection), {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    fillColor: "#ff7800",
                    weight: 0,
                    fillOpacity: 0.75
                });
            },
            onEachFeature: function(feature, marker) {
                var model = new Backbone.Model(feature.properties),
                    view = new PointSourcePopupView({model: model});
                leafletMap.on('zoomend', function(e) {
                    var newZoomLevel = e.target._zoom;
                    marker.setStyle({
                        radius: markerSizesForZoomLevels[newZoomLevel]
                    });
                });
                marker.bindPopup(view.render().el);
            },
        });
    }
};

var PointSourcePopupView = Marionette.ItemView.extend({
    template: pointSourcePopupTmpl,
    className: 'point-source-popup',
    templateHelpers: function() {
        return {
            noData: utils.noData
        };
    }
});
