"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    models = require('./models'),
    geocoderTmpl = require('./templates/geocoder.ejs'),
    searchTmpl = require('./templates/search.ejs'),
    suggestionTmpl = require('./templates/suggestion.ejs'),
    noResultsTmpl = require('./templates/noResults.ejs');

var ENTER_KEYCODE = 13;

var GeocoderView = Marionette.LayoutView.extend({
    template: geocoderTmpl,

    regions: {
        searchBoxRegion: '#geocoder-search-box-region'
    },

    onShow: function() {
        this.searchBoxRegion.show(
            new SearchBoxView({
                model: new models.GeocoderModel(),
                collection: new models.SuggestionsCollection()
            })
        );
    }
});

var SearchBoxView = Marionette.LayoutView.extend({
    template: searchTmpl,

    ui: {
        'searchBox': '#geocoder-search',
        'message': '.message',
        'resultsRegion': '#geocode-search-results-region'
    },

    events: {
        'keyup @ui.searchBox': 'processSearchInputEvent',
    },

    modelEvents: {
        'change:message': 'renderMessage',
        'change:query': 'render'
    },

    childEvents: {
        'suggestion:select:in-progress': function() {
            this.model.set('message', 'Loading...');
        },
        'suggestion:select:success': function() {
            this.reset();
            this.clearMessage();
        },
        'suggestion:select:failure': function() {
            this.getRegion('resultsRegion').empty();
            this.setErrorMessage();
        }
    },

    regions: {
        'resultsRegion': '#geocode-search-results-region'
    },

    renderMessage: function() {
        this.ui.message.html(this.model.get('message'));
    },

    processSearchInputEvent: function(e) {
        var query = $(e.target).val().trim();

        if (query === '') {
            this.clearMessage();
            this.emptyResultsRegion();
            return false;
        }

        if (e.keyCode === ENTER_KEYCODE) {
            if (this.collection.length >= 1) {
                this.selectFirst();
            }
        } else if (query !== this.model.get('query')) {
            this.model.set('query', query, { silent: true });
            this.model.set('message', 'Searching...');
            this.makeThrottledSearch(query);
        }
    },

    makeThrottledSearch: _.throttle(function(query) {
        this.handleSearch(query);
    }, 500, { leading: false, trailing: true }),

    handleSearch: function(query) {
        var defer = $.Deferred();

        this.search(query)
            .then(_.bind(this.clearMessage, this))
            .done(_.bind(this.showResultsRegion, this))
            .fail(_.bind(this.setErrorMessage, this));

        return defer.promise();
    },

    search: function(query) {
        return this.collection.fetch({
            data: { text: query },
            reset: true
        });
    },

    selectFirst: function() {
        var self = this,
            defer = $.Deferred();

        this.model.set('message', 'Loading...');

        this.collection
            .first()
            .select()
                .done(function() {
                    self.clearMessage();
                    self.collection.first().setMapViewToLocation();
                })
                .fail(_.bind(this.setErrorMessage, this))
                .always(_.bind(this.reset, this));

        return defer.promise();
    },

    clearMessage: function() {
        this.model.set('message', '');
    },

    setErrorMessage: function() {
        this.model.set('message', 'Sorry, an error occured while searching.');
    },

    showResultsRegion: function() {
        this.getRegion('resultsRegion').show(
            new SuggestionsView({
                collection: this.collection
            })
        );
    },

    emptyResultsRegion: function() {
        this.getRegion('resultsRegion').empty();
    },

    reset: function() {
        this.model.set('query', '');
        this.emptyResultsRegion();
    }
});

var SuggestionView = Marionette.ItemView.extend({
    tagName: 'li',
    template: suggestionTmpl,

    ui: {
        'result': 'span'
    },

    events: {
        'click @ui.result': 'selectSuggestion'
    },

    selectSuggestion: function() {
        this.triggerMethod('suggestion:select:in-progress');

        this.model
            .select()
            .done(_.bind(this.selectSuccess, this))
            .fail(_.bind(this.selectFail, this));
    },

    selectSuccess: function() {
        this.model.setMapViewToLocation();
        this.triggerMethod('suggestion:select:success');
    },

    selectFail: function() {
        this.triggerMethod('suggestion:select:failure');
    }
});

var NoResultsView = Marionette.ItemView.extend({
    template: noResultsTmpl
});

var SuggestionsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    childView: SuggestionView,
    emptyView: NoResultsView
});

module.exports = {
    GeocoderView: GeocoderView,
    SuggestionsView: SuggestionsView,
    SuggestionView: SuggestionView,
    SearchBoxView: SearchBoxView
};
