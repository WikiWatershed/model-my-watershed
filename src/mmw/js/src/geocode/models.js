"use strict";

var Backbone = require('../../shim/backbone');


var GeocodeResult = Backbone.Model.extend({});

var GeocodeCandidates = Backbone.Collection.extend({
    url: '/api/geocode/',
    model: GeocodeResult
});

module.exports = {
    GeocodeResult: GeocodeResult,
    GeocodeCandidates: GeocodeCandidates
};
