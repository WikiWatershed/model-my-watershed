"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),

    geocodeCandaidateTemplate = require('./templates/geocodeCandidate.ejs'),
    geocodeCollectionTemplate = require('./templates/geocodeCollection.ejs'),
    geocodeSearchTemplate = require('./templates/geocodeSearch.ejs');

var ENTER_KEYCODE = 13;

    /**
     * Single geocode result view.
     */
var GeocodeCandidateView = Marionette.ItemView.extend({
    tagName: 'li',
    template: geocodeCandaidateTemplate,
    triggers: { 'click': 'clickCandidate' }
});

/**
 * Collection view of geocode results.
 * The selected candidate is a promise that is resolved when an item is
 * clicked.
 * ChildEvents listens for clicks on the individual candidates.
 * The view is a composite so that we can display other messages along with
 * the list of results.
 */
var GeocodeCandidateCollectionView = Marionette.CompositeView.extend({
    options: {},
    childView: GeocodeCandidateView,
    childViewContainer: 'ul',
    template: geocodeCollectionTemplate,
    templateHelpers: function() {
        return { numResults: this.collection.length };
    },
    initialize: function(options) {
        this.options = options;
    },
    childEvents: {
        'clickCandidate': function (view) {
            this.options.candidateClicked(view.model);
        }
    }
});

/**
 * View to display the search box and wire keypress events to it.
 * On initialization, pass in a runSearch function as part of options. This
 * will be called when the text of the search box changes.
 */
var GeocodeSearchboxView = Marionette.LayoutView.extend({
    options: {},
    template: geocodeSearchTemplate,
    regions: {
        results: '#search-results-container'
    },
    events: {
        'keyup #geocode-search': 'runSearch'
    },
    childEvents: {
        'clickCandidate': function (view) {
            this.getRegion('results').empty();
            this.$el.find('#geocode-search').val('');

        }
    },
    initialize: function(options) {
        this.options = options;
    },
    runSearch: function(e) {
        var newVal = this.$el.find('#geocode-search').val();
        if (this.currentSearchVal !== newVal) {
            this.currentSearchVal = newVal;
            if (this.currentSearchVal === '') { // Don't hit endpoint with empty searches.
                return;
            } else {
                var query = $(e.target).val().trim();
                this.options.runSearch(query);
            }
        }
        if (e.keyCode === ENTER_KEYCODE) {
            this.$el.find('#search-results-container ul li').first().trigger('click');
        }
    },
    currentSearchVal: ''
});


module.exports = {
    GeocodeCandidateView: GeocodeCandidateView,
    GeocodeCandidateCollectionView: GeocodeCandidateCollectionView,
    GeocodeSearchboxView: GeocodeSearchboxView
};
