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
        describe('#setDisplayArea', function() {
            it('calculates and sets the area attribute to square feet if the area is less than one acre', function() {
                var model = new models.ModificationModel({
                    geojson: lessThanOneAcrePolygon
                });

                assert.equal(Math.round(model.get('area')), 6234);
                assert.equal(model.get('units'), 'sq. ft.');
            });

            it('calculates and sets the area attribute to acres if the area is greater than one acre', function() {
                var model = new models.ModificationModel({
                    geojson: greaterThanOneAcrePolygon
                });

                assert.equal(Math.round(model.get('area')), 7);
                assert.equal(model.get('units'), 'acres');
            });
        });
    });

    describe('ScenarioCollection', function() {
        describe('#duplicateScenario', function() {
            it('duplicates an existing scenario and add the new scenario to the collection', function() {
                var collection = getTestScenarioCollection(),
                    scenario = collection.at(0);

                assert.equal(collection.length, 1);

                collection.duplicateScenario(scenario.cid);
                assert.equal(collection.length, 2);
                assert.deepEqual(collection.at(0).get('modifications'), collection.at(1).get('modifications'));
                assert.equal(collection.at(1).get('name'), 'Copy of ' + collection.at(0).get('name'));
            });
        });

        describe('#makeScenarioName', function() {
            it('creates a new unique scenario name based off baseName', function() {
                var collection = getTestScenarioCollection();

                var newName = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                assert.equal(newName, 'Copy of ' + collection.at(0).get('name'));

                collection.add({ name: newName });
                var newName2 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                assert.equal(newName2, 'Copy of ' + collection.at(0).get('name') + ' 1');

                collection.add({ name: newName2 });
                var newName3 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                assert.equal(newName3, 'Copy of ' + collection.at(0).get('name') + ' 2');
            });

            it('doesn\'t append a number to the first duplicate of baseName if it doesn\'t take a number to make the name unique', function() {
                var collection = getTestScenarioCollection();

                var newName = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                assert.equal(newName, 'Copy of Foo Bar');
            });

            it('correctly generates unique names for baseNames with trailing numbers', function() {
                var collection = getTestScenarioCollection();

                collection.at(0).set('name', 'Foo Bar 1');

                var newName = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                assert.equal(newName, 'Copy of ' + collection.at(0).get('name'));

                collection.add({ name: newName });
                var newName2 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                assert.equal(newName2, 'Copy of ' + collection.at(0).get('name') + ' 1');

                collection.add({ name: newName2 });
                var newName3 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                assert.equal(newName3, 'Copy of ' + collection.at(0).get('name') + ' 2');
            });
        });
    });
});

var lessThanOneAcrePolygon = { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17049014568327, 39.95056149048882 ], [ -75.17032116651535, 39.950538872524845 ], [ -75.17038553953171, 39.9502037145458 ], [ -75.17057061195372, 39.95022633262059 ], [ -75.17049014568327, 39.95056149048882 ] ] ] } };

var greaterThanOneAcrePolygon = { "type": "FeatureCollection", "features": [ { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17273247241974, 39.950349703806005 ], [ -75.1707261800766, 39.95009473644421 ], [ -75.17104804515839, 39.94857313726802 ], [ -75.17302215099335, 39.94882399784062 ], [ -75.17273247241974, 39.950349703806005 ] ] ] } } ] };

function getTestScenarioCollection() {
    var collection = new models.ScenariosCollection([
            new models.ScenarioModel({
                name: 'Foo Bar',
                modifications: new models.ModificationsCollection([
                    new models.ModificationModel({
                        name: 'Mod 1',
                        geojson: _.cloneDeep(greaterThanOneAcrePolygon)
                    })
                ]),
                active: true
            })
        ]);

    return collection;
}
