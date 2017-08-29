"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Backbone = require('../../shim/backbone'),
    App = require('../app');

var GeocoderModel = Backbone.Model.extend({
    defaults: {
        selectedSuggestion: null, // SuggestionModel
        query: ''
    }
});

var SuggestionModel = Backbone.Model.extend({
    url: '/api/geocode/',
    idAttribute: 'magicKey',

    defaults: {
        zoom: 14,
        isBoundaryLayer: false
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

var BoundarySuggestionModel = SuggestionModel.extend({
    idAttribute: 'id',

    defaults: {
        isBoundaryLayer: true
    },

    select: function() {
        // We don't need to make a separate request for lat/lng
        var xhr = new $.Deferred();
        return xhr.resolve();
    }
});

var GeocodeSuggestions = Backbone.Collection.extend({
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

var BoundarySuggestions = GeocodeSuggestions.extend({
    model: BoundarySuggestionModel,
    url: '/api/modeling/boundary-layers-search'
});

// Composite collection which merges the results from
// GeocodeSuggestions and BoundarySuggestions.
var SuggestionsCollection = Backbone.Collection.extend({
    initialize: function() {
        this.requests = [];
        this.geocodeSuggestions = new GeocodeSuggestions();
        this.boundarySuggestions = new BoundarySuggestions();
    },

    // Abort requests in-progress
    abort: function() {
        while (this.requests.length) {
            var xhr = this.requests.pop();
            if (xhr.abort) {
                xhr.abort();
            }
        }
    },

    fetch: function(options) {
        var combineSuggestions = _.bind(this.combineSuggestions, this);

        var xhr = $.Deferred();
        var failures = 0;
        var successes = 0;

        function always() {
            if (successes + failures < 2) {
                // Wait for both requests to complete
                return;
            } else if (failures === 2) {
                // Reject if both requests failed
                xhr.reject();
            } else {
                // Resolve if at least one request succeeded
                xhr.resolve();
            }
        }

        function fetch(coll) {
            var xhr = coll.fetch(options);
            xhr.then(combineSuggestions)
                .done(function() {
                    successes++;
                })
                .fail(function() {
                    failures++;
                })
                .always(always);
            return xhr;
        }

        this.abort();
        this.requests.push(fetch(this.geocodeSuggestions));
        this.requests.push(fetch(this.boundarySuggestions));

        var promise = xhr.promise();
        promise.cancel = function() {
            xhr.reject({ cancelled: true });
        };
        return promise;
    },

    combineSuggestions: function() {
        var models = [].concat(
            this.geocodeSuggestions.models,
            this.boundarySuggestions.models);
        this.set(models);
    }
});

module.exports = {
    GeocoderModel: GeocoderModel,
    SuggestionModel: SuggestionModel,
    SuggestionsCollection: SuggestionsCollection
};
