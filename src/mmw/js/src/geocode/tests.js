"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    sinon = require('sinon'),
    App = require('../app'),
    views = require('./views'),
    models = require('./models'),
    testUtils = require('../core/testUtils');

var sandboxId = 'sandbox',
    sandboxSelector = '#' + sandboxId;

describe('Geocoder', function() {
    var MSG_ERROR = 'Oops! Something went wrong.';

    before(function() {
        if ($(sandboxSelector).length === 0) {
            $('<div>', {id: sandboxId}).appendTo('body');
        }
    });

    beforeEach(function() {
        this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;
    });

    afterEach(function() {
        $(sandboxSelector).empty();
        this.server.restore();
        testUtils.resetApp(App);
    });

    after(function() {
        $(sandboxSelector).remove();
    });

    describe('SearchBoxView', function() {
        it('renders one list item if there is one suggestion', function(done) {
            var testData = getTestSuggestions(1),
                responseData = JSON.stringify({ suggestions: testData });

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            testNumberOfResults(testData.length * 2, done);
        });

        it('renders multiple list items if there are multiple suggestions', function(done) {
            var testData = getTestSuggestions(10),
                responseData = JSON.stringify({ suggestions: testData });

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            testNumberOfResults(testData.length * 2, done);
        });

        it('renders an error message if there was a problem getting suggestions', function(done) {
            this.server.respondWith([500, { 'Content-Type': 'application/json' }, '[]']);
            var view = createView();

            view.handleSearch('a query').fail(function() {
                assert.equal($('#sandbox li').length, 0);
                assert.include($('.message').text().trim(), MSG_ERROR);
                done();
            });
        });

        it('renders an error message if there was a problem selecting a suggestion', function(done) {
            var testData = getTestSuggestions(3),
                responseData = JSON.stringify({ suggestions: testData }),
                view = createView();

            this.server.respondWith(/geocode.arcgis.com/,
                [200, { 'Content-Type': 'application/json' }, responseData]);

            var self = this;
            view.handleSearch('a query').done(function() {
                self.server.respondWith([500, { 'Content-Type': 'application/json' }, responseData]);

                view.selectFirst().fail(function() {
                    assert.equal($('#sandbox li').length, 0);
                    assert.include($('.message').text().trim(), MSG_ERROR);
                    done();
                });
            });
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

            view.handleSearch('a query').done(function() {
                var e = $.Event('keyup'),
                    spy = sinon.spy(view, 'selectFirst');

                e.keyCode = 13;
                e.target = selector;
                $(selector).val('a query');

                view.processSearchInputEvent(e);
                assert.equal(spy.callCount, 1);

                done();
            });
        });

        it('does not attempt to select a suggestion when the enter key is pressed if there are no results', function(done) {
            var testData = getTestSuggestions(0),
                responseData = JSON.stringify({ suggestions: testData }),
                view = createView();

            this.server.respondWith([200, { 'Content-Type': 'application/json' }, responseData]);

            view.handleSearch('a query').done(function() {
                var e = $.Event('keyup'),
                    spy = sinon.spy(view, 'selectFirst');

                e.keyCode = 13;
                e.target = '#geocoder-search';
                $('#geocoder-search').val('a query');

                view.processSearchInputEvent(e);
                assert.equal(spy.callCount, 0);

                done();
            });
        });
    });

    describe('SuggestionModel', function() {
        describe('#setMapViewLocation', function() {
            it('sets map model\'s position attributes to the geocode result position', function() {
                var testSuggestion = getTestSuggestions(1),
                    model = new models.SuggestionModel(testSuggestion[0]),
                    testGeocode = getTestGeocodes(1),
                    zoomLevel = 15;

                model.fetch = function() {
                    model.set(testGeocode[0]);
                };

                model.select();
                model.setMapViewToLocation(zoomLevel);

                assert.almostEqual(App.map.get('lat'), model.get('y'));
                assert.almostEqual(App.map.get('lng'), model.get('x'));
                assert.almostEqual(App.map.get('zoom'), zoomLevel);
            });
        });

        describe('#select', function() {
            it('fetches location information for the selected model', function(done) {
                var testSuggestion = getTestSuggestions(1),
                    testGeocode = getTestGeocodes(1),
                    model = new models.SuggestionModel(testSuggestion[0]);

                this.server.respondWith([200, { 'Content-Type': 'application/json' },
                    JSON.stringify(testGeocode)]);

                model.select().done(function() {
                    assert.equal(model.get('y'), testGeocode[0].y);
                    assert.equal(model.get('x'), testGeocode[0].x);
                    done();
                });
            });
        });
    });
});

function testNumberOfResults(count, done) {
    var view = createView();

    view.handleSearch('a query').done(function() {
        assert.equal($('#sandbox li').length, count);
        done();
    });
}

function createView() {
    var view = new views.SearchBoxView({
            model: new models.GeocoderModel(),
            collection: new models.SuggestionsCollection()
        });

    $(sandboxSelector).html(view.render().el);

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
