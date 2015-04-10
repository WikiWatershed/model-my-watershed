"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    views = require('../core/views'),
    geocodeViews = require('./views'),
    models = require('./models');

var gcc = new models.GeocodeCandidates();

function fetchResults(query) {
    // TODO: adjust ajaxLatest to allow canceling older queries.
    return gcc.fetch({
        data: { search: query },
        reset: true
    });
}

function selectCandidate(data) {
    var defer = $.Deferred(),
        geocodeCandidateView = new geocodeViews.GeocodeCandidateView();

    if (data.length === 0) {
        defer.reject('No results');
    } else {
        var gcc = new models.GeocodeCandidates(data),
            gcv = new geocodeViews.GeocodeCandidateCollectionView({
                collection: gcc,
                candidateClicked: function(obj) {
                    defer.resolve(obj);
                }
            });

        geocodeSearchboxView.getRegion('results').show(gcv);
    }
    return defer.promise();
}

// Prevent too many search queries from piling up.
var runSearch = _.throttle(function(query) {
    fetchResults(query)
        .then(selectCandidate)
        .then(zoomToCandidate)
        .fail(displayErrorMessage);
}, 333, { leading: false, trailing: true });

var zoomToCandidate = function(candidate) {
    var zoomLevel = 18;
    candidate.setMapViewToCandidate(zoomLevel);
};

var displayErrorMessage = function(message) {
    geocodeSearchboxView
        .getRegion('results')
        .show(new views.StaticView({ message: message }));
};

var geocodeSearchboxView = new geocodeViews.GeocodeSearchboxView({ runSearch: runSearch });

module.exports = {
    geocodeSearchboxView: geocodeSearchboxView
};
