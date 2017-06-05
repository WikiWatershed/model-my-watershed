"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    dataCatalogWindowTmpl = require('./templates/window.html'),
    searchResultsTmpl = require('./templates/searchresults.html');

var ENTER = 13;

var dom = {
    searchBox: '.data-catalog-search-input',
    searchResults: '.data-catalog-results',
    catalogButton: '.data-catalog-sources > button',
    resource: '.data-catalog-results > .resource',
    expandLink: '[data-action="expand"]'
};

var DataCatalogWindow = Backbone.View.extend({
    tagName: 'div',
    className: 'data-catalog-window',

    initialize: function(model, collection) {
        this.model = model;
        this.collection = collection;

        this.listenTo(collection, 'request', this.searchStarted);
        this.listenTo(collection, 'sync error reset', this.searchDone);

        this.$el.on('click', dom.expandLink, _.bind(this.expand, this));
        this.$el.on('click', dom.catalogButton, _.bind(this.onSelectCatalog, this));
        this.$el.on('keypress', dom.searchBox, _.bind(this.onKeyPress, this));
        this.$el.on('mouseover', dom.resource, _.bind(this.highlightResult, this));
    },

    onKeyPress: function(e) {
        var $el = $(e.target),
            searchText = $el.val();

        this.model.set('searchText', searchText);

        if (e.keyCode === ENTER) {
            e.preventDefault();
            this.collection.search(this.model);
        }
    },

    onSelectCatalog: function(e) {
        var catalog = $(e.currentTarget).data('catalog');
        this.model.set('catalog', catalog);
        this.collection.search(this.model);
    },

    highlightResult: function(e) {
        var cid = $(e.currentTarget).data('cid'),
            model = this.collection.get(cid),
            geom = model.get('geom');
        App.map.set('dataCatalogActiveResult', geom);
    },

    searchStarted: function() {
        this.model.set('isSearching', true);
        this.renderResults();
    },

    searchDone: function() {
        var geoms = this.collection.pluck('geom');
        this.model.set('isSearching', false);
        this.renderResults();
        App.map.set('dataCatalogResults', geoms);
    },

    expand: function(e) {
        var $el = $(e.target);
        var $resource = $el.parents('.resource');
        $resource.addClass('expanded');
    },

    getRenderContext: function() {
        return {
            results: this.collection.models,
            isSearching: this.model.get('isSearching'),
            searchText: this.model.get('searchText')
        };
    },

    renderSearch: function() {
        var html = dataCatalogWindowTmpl.render(this.getRenderContext());
        this.$el.html(html);
    },

    renderResults: function() {
        var html = searchResultsTmpl.render(this.getRenderContext());
        this.$el.find(dom.searchResults).html(html);
    },

    render: function() {
        this.renderSearch();
        this.renderResults();
    }
});

module.exports = {
    DataCatalogWindow: DataCatalogWindow,
};
