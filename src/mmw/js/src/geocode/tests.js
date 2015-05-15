"use strict";

require('../core/testInit.js');

var _ = require('lodash'),
    L = require('leaflet'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Backbone = require('../../shim/backbone'),
    sinon = require('sinon'),
    App = require('../app'),
    views = require('./views'),
    models = require('./models');

describe('Geocoder', function() {
    before(function() {
        if ($('#sandbox').length === 0) {
            $('<div>', {id: 'sandbox'}).appendTo('body');
        }
    });

    beforeEach(function() {
        this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;
    });

    afterEach(function() {
        $('#sandbox').empty();
        this.server.restore();
    });

    after(function() {
        $('#sandbox').remove();
    });

    describe('SearchBoxView', function() {
        it('renders no list items if there no suggestions', function(done) {
            this.server.respondWith([200, { 'Content-Type': 'application/json' }, '[]']);

            testNumberOfResults(0, done);
        });

        it('renders one list item if there is one suggestion', function(done) {
            var testData = getTestSuggestions(1),
                responseData = JSON.stringify({ suggestions: testData });

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            testNumberOfResults(testData.length, done);
        });

        it('renders multiple list items if there are multiple suggestions', function(done) {
            var testData = getTestSuggestions(10),
                responseData = JSON.stringify({ suggestions: testData });

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            testNumberOfResults(testData.length, done);
        });

        it('renders an error message if there was a problem getting suggestions', function(done) {
            this.server.respondWith([500, { 'Content-Type': 'application/json' }, '[]']);
            var view = createView();

            view.handleSearch('a query').then(function() {
                assert.equal($('#sandbox li').length, 0);
                assert.include($('.message').text(), 'error');
                done();
            }());
        });

        it('renders an error message if there was a problem selecting a suggestion', function(done) {
            var testData = getTestSuggestions(3),
                responseData = JSON.stringify({ suggestions: testData }),
                view = createView();

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            var self = this;
            view.handleSearch('a query').done(function() {
                self.server.respondWith([500, { 'Content-Type': 'application/json' }, responseData]);

                view.selectFirst().done(function() {
                    assert.equal($('#sandbox li').length, 0);
                    assert.include($('.message').text(), 'error');
                    done();
                }());
            }());
        });

        it('does nothing if the search input is blank and the enter key is pressed', function() {
            var view = createView(),
                e = $.Event('keyup'),
                spy = sinon.spy(view, 'handleSearch'),
                selector = '#sandbox #geocoder-search';

            e.keyCode = 13;
            e.target = selector;
            $(selector).val('');

            view.processSearchInputEvent(e);
            assert.equal(spy.callCount, 0);
        });

        it('makes a search if a search term has been entered and a keyup event has occured', function() {
            var view = createView(),
                e = $.Event('keyup'),
                spy = sinon.spy(view, 'makeThrottledSearch'),
                selector = '#sandbox #geocoder-search';

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, '[]']);

            e.target = selector;
            e.keyCode = 87; // W, just has to be a letter
            $(selector).val('a query');

            view.processSearchInputEvent(e);
            assert.equal(spy.callCount, 1);
        });

        it('selects the first suggestion if there are suggestion when the enter key is pressed', function(done) {
            var testData = getTestSuggestions(3),
                responseData = JSON.stringify({ suggestions: testData }),
                view = createView(),
                selector = '#geocoder-search';

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            var self = this;
            view.handleSearch('a query').done(function() {
                var e = $.Event('keyup'),
                    spy = sinon.spy(view, 'selectFirst');

                e.keyCode = 13;
                e.target = selector;
                $(selector).val('a query');

                view.processSearchInputEvent(e);
                assert.equal(spy.callCount, 1);

                done();
            }());
        });

        it('does not attempt to select a suggestion when the enter key is pressed if there are no results', function(done) {
            var testData = getTestSuggestions(0),
                responseData = JSON.stringify({ suggestions: testData }),
                view = createView();

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            var self = this;
            view.handleSearch('a query').done(function() {
                var e = $.Event('keyup'),
                    spy = sinon.spy(view, 'selectFirst');

                e.keyCode = 13;
                e.target = '#geocoder-search';
                $('#geocoder-search').val('a query');

                view.processSearchInputEvent(e);
                assert.equal(spy.callCount, 0);

                done();
            }());
        });
    });

    describe('SuggestionModel', function() {
        it('#setMapViewToLocation sets map model\'s position attributes to the geocode result position', function() {
            var testSuggestion = getTestSuggestions(1),
                model = new models.SuggestionModel(testSuggestion[0]),
                testGeocode = getTestGeocodes(1),
                zoomLevel = 15;

            model.set('location', new models.LocationModel(testGeocode[0]));
            model.setMapViewToLocation(zoomLevel);

            assert.equal(App.map.get('lat'), model.get('location').get('y'));
            assert.equal(App.map.get('lng'), model.get('location').get('x'));
            assert.equal(App.map.get('zoom'), zoomLevel);
        });

        it('#select fetchs location information for the selected model', function(done) {
            var testSuggestion = getTestSuggestions(1),
                model = new models.SuggestionModel(testSuggestion[0]),
                testGeocode = JSON.stringify(getTestGeocodes(1));

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, testGeocode]);

            model.select().done(function() {
                assert.instanceOf(model.get('location'), Backbone.Model);
                done();
            });
        });
    });
});

function testNumberOfResults(count, done) {
    var view = createView();

    view.handleSearch('a query').done(function() {
        assert.equal($('#sandbox li').length, count);
        done();
    }());
}

function createView() {
    var view = new views.SearchBoxView({
            model: new models.GeocoderModel(),
            collection: new models.SuggestionsCollection()
        });

    $('#sandbox').html(view.render().el);

    return view;
}

function getTestSuggestions(count) {
    var suggestion = {
        key: 'j34jhk34jhj34jh3j4hj34hj',
        text: '1234 Market St, Philadelphia, PA 19107'
    };

    return _.times(count, function() {
        return suggestion;
    });
}

function getTestGeocodes(count) {
    var result = {
            address: '1234 Market St',
            city: 'Philadelphia',
            region: 'PA',
            x: -75,
            y: 40
    };

    return _.times(count, function() {
        return result;
    });
}
