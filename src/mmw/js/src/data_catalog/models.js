"use strict";

var _ = require('underscore'),
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    utils = require('./utils');

var DESCRIPTION_LENGTH = 300;

var DataCatalogModel = Backbone.Model.extend({
    defaults: {
        catalog: '',
        isSearching: false,
        searchText: ''
    }
});

var ResourceModel = Backbone.Model.extend({
    showExpandLink: function() {
        return this.getDescription() !== this.getShortDescription();
    },

    getDescription: function() {
        return this.get('description') || '';
    },

    getShortDescription: function() {
        var text = this.getDescription();
        if (text.length <= DESCRIPTION_LENGTH) {
            return text;
        }
        var truncated = text.substr(0,
            text.indexOf(' ', DESCRIPTION_LENGTH));
        return truncated + '... ';
    },

    getDetailUrl: function() {
        var links = this.get('links'),
            detailUrl = _.findWhere(links, { type: 'details' });
        return detailUrl && detailUrl.href;
    }
});

var ResourceCollection = Backbone.Collection.extend({
    url: '/api/bigcz/search',
    model: ResourceModel,

    parse: function(response) {
        return response.results;
    },

    search: function(searchModel) {
        var searchText = searchModel.get('searchText'),
            catalog = searchModel.get('catalog');

        if (searchText.length < 3) {
            this.reset(null);
            return;
        }

        var bounds = App.getLeafletMap().getBounds();
        var bbox = utils.formatBounds(bounds);

        this.fetch({
            data: {
                bbox: bbox,
                catalog: catalog,
                query: searchText
            }
        });
    }
});

module.exports = {
    DataCatalogModel: DataCatalogModel,
    ResourceCollection: ResourceCollection,
    ResourceModel: ResourceModel
};
