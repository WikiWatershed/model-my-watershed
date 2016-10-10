"use strict";

var L = require('leaflet'),
    $ = require('jquery'),
    utils = require('./utils'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    catchmentWaterQualityPopupTmpl = require('./templates/catchmentWaterQualityPopup.html');

var Layer = {
    createLayer: function(geojsonFeatureCollection) {
        return L.geoJson($.parseJSON(geojsonFeatureCollection), {
            onEachFeature: function(feature, catchmentPolygon) {
                var model = new Backbone.Model(feature.properties),
                    view = new CatchmentWaterQualityPopupView({ model: model });
                catchmentPolygon.bindPopup(view.render().el);
            },
        });
    }
};

var CatchmentWaterQualityPopupView = Marionette.ItemView.extend({
    template: catchmentWaterQualityPopupTmpl,
    className: 'catchment-water-quality-popup',

    templateHelpers: function() {
        return {
            noData: utils.noData
        };
    }
});

module.exports.Layer = Layer;
module.exports.CatchmentWaterQualityPopupView = CatchmentWaterQualityPopupView;
