"use strict";

var Backbone = require('../../shim/backbone'),
    App = require('../app');

var GeocoderModel = Backbone.Model.extend({
    defaults: {
        message: '',
        query: ''
    }
});

var LocationModel = Backbone.Model.extend({
    url: '/api/geocode/',

    parse: function(response) {
        if (response.length) {
            return response[0];
        } else {
            return {};
        }
    }
});

var SuggestionModel = Backbone.Model.extend({
    defaults: {
        zoom: 18
    },

    setMapViewToLocation: function(zoom) {
        App.map.set({
            lat: this.get('location').get('y'),
            lng: this.get('location').get('x'),
            zoom: zoom || this.get('zoom')
        });
    },

    select: function() {
        var data = {
            key: this.get('magicKey'),
            search: this.get('text')
        };

        this.set('location', new LocationModel(data));

        return this.get('location').fetch({ data: data });
    }
});

var SuggestionsCollection = Backbone.Collection.extend({
    model: SuggestionModel,
    url: function() {
        return 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json' +
               '&searchExtent=' + this.getBoundingBox();
    },

    getBoundingBox: function() {
        // Continental US
        return '-127.17,24.76,-66.53,50.4575';
    },

    parse: function(response) {
        return response.suggestions;
    }
});

module.exports = {
    GeocoderModel: GeocoderModel,
    SuggestionModel: SuggestionModel,
    LocationModel: LocationModel,
    SuggestionsCollection: SuggestionsCollection
};
