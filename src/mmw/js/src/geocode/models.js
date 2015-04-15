"use strict";

var Backbone = require('../../shim/backbone'),
    App = require('../app');

var GeocoderModel = Backbone.Model.extend({
    defaults: {
        message: '',
        query: ''
    }
});

var GeocoderCandidateModel = Backbone.Model.extend({
    setMapViewToCandidate: function(zoom) {
        App.map.set({
            lat: this.get('y'),
            lng: this.get('x'),
            zoom: zoom
        });
    }
});

var GeocoderCandidatesCollection = Backbone.Collection.extend({
    url: '/api/geocode/',
    model: GeocoderCandidateModel
});

module.exports = {
    GeocoderModel: GeocoderModel,
    GeocoderCandidateModel: GeocoderCandidateModel,
    GeocoderCandidatesCollection: GeocoderCandidatesCollection
};
