"use strict";

var Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette');

var MapModel = Backbone.Model.extend({
    defaults: {
        lat: 0,
        lng: 0,
        zoom: 0,
        // Active shape on the map; GeoJSON object
        areaOfInterest: null
    }
});

module.exports = {
    MapModel: MapModel
};
