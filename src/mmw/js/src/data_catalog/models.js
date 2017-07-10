"use strict";

var _ = require('underscore'),
    Backbone = require('../../shim/backbone'),
    turfIntersect = require('turf-intersect'),
    App = require('../app'),
    utils = require('./utils');

var DESCRIPTION_MAX_LENGTH = 100;

var Catalog = Backbone.Model.extend({
    defaults: {
        id: '',
        name: '',
        description: '',
        loading: false,
        active: false,
        results: null, // Results collection
        resultCount: 0
    },

    search: function(query, bounds) {
        var bbox = utils.formatBounds(bounds),
            data = {
                catalog: this.id,
                query: query,
                bbox: bbox
            };

        return this.startSearch(data)
            .always(_.bind(this.finishSearch, this));
    },

    startSearch: function(data) {
        this.set('loading', true);
        return this.get('results').fetch({ data: data });
    },

    finishSearch: function() {
        this.set('loading', false);
        this.set('resultCount', this.get('results').size());
    }
});

var Catalogs = Backbone.Collection.extend({
    model: Catalog
});

var Result = Backbone.Model.extend({
    defaults: {
        id: '',
        title: '',
        description: '',
        geom: null, // GeoJSON
        links: null, // Array
        created: '',
        updated: ''
    },

    getSummary: function() {
        var text = this.get('description') || '';
        if (text.length <= DESCRIPTION_MAX_LENGTH) {
            return text;
        }
        var truncated = text.substr(0,
            text.indexOf(' ', DESCRIPTION_MAX_LENGTH));
        return truncated + '&hellip;';
    },

    getDetailsUrl: function() {
        var links = this.get('links') || [],
            detailsUrl = _.findWhere(links, { type: 'details' });
        return detailsUrl && detailsUrl.href;
    },

    toJSON: function() {
        return _.assign({}, this.attributes, {
            summary: this.getSummary(),
            detailsUrl: this.getDetailsUrl()
        });
    }
});

var Results = Backbone.Collection.extend({
    url: '/api/bigcz/search',
    model: Result,
    parse: function(response) {
        var aoi = App.map.get('areaOfInterest');

        // Filter results to only include those without geometries (Hydroshare)
        // and those that intersect the area of interest (CINERGI and CUAHSI).
        return _.filter(response.results, function(r) {
            return r.geom === null || turfIntersect(aoi, r.geom) !== undefined;
        });
    }
});

var SearchForm = Backbone.Model.extend({
    defaults: {
        query: ''
    }
});

module.exports = {
    Catalog: Catalog,
    Catalogs: Catalogs,
    Result: Result,
    Results: Results,
    SearchForm: SearchForm
};
