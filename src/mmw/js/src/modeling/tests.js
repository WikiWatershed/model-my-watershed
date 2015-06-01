"use strict";

require('../core/testInit.js');

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    sinon = require('sinon'),
    models = require('./models'),
    views = require('./views');

describe('Modeling', function() {
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
    });

    after(function() {
        $('#sandbox').remove();
    });

    describe('ModificationModel', function() {
        it('#setDisplayArea calculates and sets the area attribute to square feet if the area is less than one acre', function() {
            var model = new models.ModificationModel({
                geojson: lessThanOneAcrePolygon
            });

            assert.equal(Math.round(model.get('area')), 6234);
            assert.equal(model.get('units'), 'sq. ft.');
        });

        it('#setDisplayArea calculates and sets the area attribute to acres if the area is greater than one acre', function() {
            var model = new models.ModificationModel({
                geojson: greaterThanOneAcrePolygon
            });

            assert.equal(Math.round(model.get('area')), 7);
            assert.equal(model.get('units'), 'acres');
        });
    });
});

var lessThanOneAcrePolygon = { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17049014568327, 39.95056149048882 ], [ -75.17032116651535, 39.950538872524845 ], [ -75.17038553953171, 39.9502037145458 ], [ -75.17057061195372, 39.95022633262059 ], [ -75.17049014568327, 39.95056149048882 ] ] ] } };

var greaterThanOneAcrePolygon = { "type": "FeatureCollection", "features": [ { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17273247241974, 39.950349703806005 ], [ -75.1707261800766, 39.95009473644421 ], [ -75.17104804515839, 39.94857313726802 ], [ -75.17302215099335, 39.94882399784062 ], [ -75.17273247241974, 39.950349703806005 ] ] ] } } ] };
