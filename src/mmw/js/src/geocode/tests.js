"use strict";

var _ = require('lodash'),
    L = require('leaflet'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    views = require('./views'),
    models = require('./models');

function getTestCandidates(count) {
    var candidate = {
            address: '1234 Market St',
            city: 'Philadelphia',
            region: 'PA',
            x: -75,
            y: 40
    };

    return _.times(count, function() {
        return candidate;
    });
}

suite('Geocode', function() {
    before(function() {
        $('<div>', {id: 'sandbox'}).appendTo('body');
    });

    afterEach(function() {
        $('#sandbox').empty();
    });

    test('view renders no list items if there are no search candidates', function() {
        var collection = new models.GeocodeCandidates([]),
            view = new views.GeocodeCandidateCollectionView({ collection: collection });

        $('#sandbox').html(view.render().el);

        assert.equal($('#sandbox li').length, 0);
    });

    test('view renders one list item if there is one search candidate', function() {
        var testData = getTestCandidates(1),
            collection = new models.GeocodeCandidates(testData),
            view = new views.GeocodeCandidateCollectionView({ collection: collection });

        $('#sandbox').html(view.render().el);

        assert.equal($('#sandbox li').length, 1);
    });

    test('view renders multiple list items if there are multiple search candidates', function() {
        var testData = getTestCandidates(10),
            collection = new models.GeocodeCandidates(testData),
            view = new views.GeocodeCandidateCollectionView({ collection: collection });

        $('#sandbox').html(view.render().el);

        assert.equal($('#sandbox li').length, 10);
    });

    test('model.setMapViewToCandidate sets map model\'s position attributes to the candidates position', function() {
        var testData = getTestCandidates(1),
            model = new models.GeocodeCandidate(testData[0]);

        var zoomLevel = 18;
        model.setMapViewToCandidate(zoomLevel);

        assert.equal(App.map.get('lat'), model.get('y'));
        assert.equal(App.map.get('lng'), model.get('x'));
        assert.equal(App.map.get('zoom'), zoomLevel);
    });
});
