"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
    views = require('../views'),
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

function setMapView(lat, lng, zoom) {
    App.getMap().setView(L.latLng(lat, lng), zoom);
}

// Prevent too many search queries from piling up.
var runSearch = _.throttle(function(e) {
    fetchResults(e)
        .then(selectCandidate)
        .then(zoomToCandidate)
        .fail(displayErrorMessage);
}, 333, { leading: false, trailing: true });

var zoomToCandidate = function(candidate) {
    setMapView(candidate.get('y'), candidate.get('x'), 18);
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
