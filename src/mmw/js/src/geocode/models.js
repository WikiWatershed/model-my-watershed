"use strict";

var Backbone = require('../../shim/backbone'),
    App = require('../app');

var GeocoderModel = Backbone.Model.extend({
    defaults: {
        query: ''
    }
});

var SuggestionModel = Backbone.Model.extend({
    url: '/api/geocode/',

    defaults: {
        zoom: 18
    },

    setMapViewToLocation: function(zoom) {
        var lat = this.get('y'),
            lng = this.get('x');
        if (lat && lng) {
            App.map.set({
                lat: lat,
                lng: lng,
                zoom: zoom || this.get('zoom')
            });
        }
    },

    select: function() {
        var data = {
            key: this.get('magicKey'),
            search: this.get('text')
        };
        return this.fetch({ data: data });
    },

    parse: function(data) {
        // Parse from API request
        if (data.length) {
            return data[0];
        }
        // Parse from initialization
        return data;
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
    SuggestionsCollection: SuggestionsCollection
};
