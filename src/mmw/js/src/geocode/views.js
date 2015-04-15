"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    models = require('./models'),
    geocoderTmpl = require('./templates/geocoder.ejs'),
    geocoderSearchTmpl = require('./templates/geocoderSearch.ejs'),
    geocoderCandidateTmpl = require('./templates/geocoderCandidate.ejs'),
    noGeocodeResultsTmpl = require('./templates/noGeocodeResults.ejs');

var ENTER_KEYCODE = 13;

var GeocoderView = Marionette.LayoutView.extend({
    template: geocoderTmpl,

    regions: {
        searchBoxRegion: '#geocoder-search-box-region'
    },

    onShow: function() {
        this.searchBoxRegion.show(
            new GeocoderSearchBoxView({
                model: new models.GeocoderModel(),
                collection: new models.GeocoderCandidatesCollection()
            })
        );
    }
});

var GeocoderSearchBoxView = Marionette.LayoutView.extend({
    template: geocoderSearchTmpl,

    ui: {
        'searchBox': '#geocoder-search'
    },

    events: {
        'keyup @ui.searchBox': 'prepareSearch'
    },

    modelEvents: {
        'change:message': 'renderMessage',
        'change:query': 'render'
    },

    childEvents: {
        'candidate:selected': function() {
            this.reset();
        }
    },

    regions: {
        'resultsRegion': '#geocode-search-results-region'
    },

    renderMessage: function() {
        this.$el.find('.message').html(this.model.get('message'));
    },

    prepareSearch: function(e) {
        var query = $(e.target).val().trim();

        if (query === '') {
            this.reset();
            return false;
        }

        if (e.keyCode === ENTER_KEYCODE) {
            var zoomLevel = 18;
            this.collection.first().setMapViewToCandidate(18);
            this.reset();
        } else if (query !== this.model.get('query')) {
            this.model.set('query', query, { silent: true });
            this.model.set('message', 'Searching...');
            this.handleSearch(query);
        }
    },

    handleSearch: _.throttle(function(query, cb) {
        this.search(query)
            .then(_.bind(this.clearMessage, this))
            .then(_.bind(this.showResultsRegion, this))
            .fail(_.bind(this.setErrorMessage, this))
            .always(function() {
                if (cb && typeof cb === 'function') { cb(this); }
            });

    }, 1000, { leading: false, trailing: true }),

    search: function(query) {
        return this.collection.fetch({
            data: { search: query },
            reset: true
        });
    },

    clearMessage: function() {
        this.model.set('message', '');
    },

    setErrorMessage: function() {
        this.model.set('message', 'Sorry, an error occured while searching.');
    },

    showResultsRegion: function() {
        this.getRegion('resultsRegion').show(
            new GeocoderCandidateCollectionView({
                collection: this.collection
            })
        );
    },

    reset: function() {
        this.getRegion('resultsRegion').empty();
        this.model.set('query', '');
        this.clearMessage();
    }
});

/**
 * Single geocode result view.
 */
var GeocoderCandidateView = Marionette.ItemView.extend({
    tagName: 'li',
    template: geocoderCandidateTmpl,

    ui: {
        'result': 'span'
    },

    events: {
        'click @ui.result': 'selectCandidate'
    },

    selectCandidate: function() {
        var zoomLevel = 18;
        this.model.setMapViewToCandidate(18);
        this.triggerMethod('candidate:selected');
    }
});

var NoGeocodeResultsView = Marionette.ItemView.extend({
    template: noGeocodeResultsTmpl
});

/**
 * Collection view of geocode results.
 */
var GeocoderCandidateCollectionView = Marionette.CollectionView.extend({
    tagName: 'ul',
    childView: GeocoderCandidateView,
    emptyView: NoGeocodeResultsView
});

module.exports = {
    GeocoderView: GeocoderView,
    GeocoderCandidateCollectionView: GeocoderCandidateCollectionView,
    GeocoderCandidateView: GeocoderCandidateView
};
