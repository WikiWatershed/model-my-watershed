"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    models = require('./models'),
    geocoderTmpl = require('./templates/geocoder.html'),
    searchTmpl = require('./templates/search.html'),
    suggestionTmpl = require('./templates/suggestion.html');

var ENTER_KEYCODE = 13;

var ICON_BASE = 'search-icon fa ',
    ICON_DEFAULT = 'fa-search',
    ICON_WORKING = 'fa-circle-o-notch fa-spin',
    ICON_EMPTY   = 'fa-exclamation-triangle empty',
    ICON_ERROR   = 'fa-exclamation-triangle error';

var MSG_DEFAULT = '',
    MSG_EMPTY   = 'No results found.',
    MSG_ERROR   = 'Oops! Something went wrong.';

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
        'searchIcon': '.search-icon',
        'message': '.message',
        'messageDismiss': '.dismiss',
        'resultsRegion': '#geocode-search-results-region'
    },

    events: {
        'keyup @ui.searchBox': 'processSearchInputEvent',
        'click @ui.messageDismiss': 'dismissAction',
    },

    modelEvents: {
        'change:query': 'render'
    },

    childEvents: {
        'suggestion:select:in-progress': function() {
            this.setStateWorking();
        },
        'suggestion:select:success': function() {
            this.reset();
            this.setStateDefault();
        },
        'suggestion:select:failure': function() {
            this.emptyResultsRegion();
            this.setStateError();
        }
    },

    regions: {
        'resultsRegion': '#geocode-search-results-region'
    },

    setIcon: function(icon) {
        this.ui.searchIcon.prop('class', ICON_BASE + icon);
    },

    setMessage: function(message) {
        this.ui.message.find('span').html(message);
        if (message && message !== '') {
            this.ui.message.removeClass('hidden');
        } else {
            this.ui.message.addClass('hidden');
        }
    },

    setStateDefault: function() {
        this.setIcon(ICON_DEFAULT);
        this.setMessage(MSG_DEFAULT);
    },

    setStateWorking: function() {
        this.setIcon(ICON_WORKING);
    },

    setStateEmpty: function() {
        this.emptyResultsRegion();
        this.setIcon(ICON_EMPTY);
        this.setMessage(MSG_EMPTY);
    },

    setStateError: function() {
        this.emptyResultsRegion();
        this.setIcon(ICON_ERROR);
        this.setMessage(MSG_ERROR);
    },

    processSearchInputEvent: function(e) {
        var query = $(e.target).val().trim();

        if (query === '') {
            this.setStateDefault();
            this.emptyResultsRegion();
            return false;
        }

        if (e.keyCode === ENTER_KEYCODE) {
            if (this.collection.length >= 1) {
                this.selectFirst();
            }
        } else if (query !== this.model.get('query')) {
            this.model.set('query', query, { silent: true });
            this.setStateWorking();
            this.makeThrottledSearch(query);
        }
    },

    makeThrottledSearch: _.throttle(function(query) {
        this.handleSearch(query);
    }, 500, { leading: false, trailing: true }),

    handleSearch: function(query) {
        var defer = $.Deferred();

        this.search(query)
            .then(_.bind(this.setStateDefault, this))
            .done(_.bind(this.showResultsRegion, this))
            .fail(_.bind(this.setStateError, this));

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

        this.setStateWorking();

        this.collection
            .first()
            .select()
                .done(function() {
                    self.setStateDefault();
                    self.collection.first().setMapViewToLocation();
                })
                .fail(_.bind(this.setStateError, this))
                .always(_.bind(this.reset, this));

        return defer.promise();
    },

    showResultsRegion: function() {
        if (this.collection.isEmpty()) {
            this.setStateEmpty();
            return false;
        }

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
    },

    dismissAction: function() {
        this.reset();
        this.setStateDefault();
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

var SuggestionsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    childView: SuggestionView
});

module.exports = {
    GeocoderView: GeocoderView,
    SuggestionsView: SuggestionsView,
    SuggestionView: SuggestionView,
    SearchBoxView: SearchBoxView
};
