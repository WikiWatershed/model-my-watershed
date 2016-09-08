"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    coreModels = require('../core/models'),
    coreUtils = require('../core/utils'),
    models = require('./models'),
    views = require('./views'),
    mocks = require('./mocks'),
    App = require('../app'),
    testUtils = require('../core/testUtils');

var sandboxId = 'sandbox',
    sandboxSelector = '#' + sandboxId,
    SandboxRegion = Marionette.Region.extend({
        el: sandboxSelector
    });

describe('Analyze', function() {
    before(function() {
        if ($(sandboxSelector).length === 0) {
            $('<div>', {id: sandboxId}).appendTo('body');
        }
    });

    beforeEach(function() {

    });

    afterEach(function() {
        $(sandboxSelector).remove();
        $('<div>', {id: sandboxId}).appendTo('body');
        testUtils.resetApp(App);
    });

    after(function() {
        $(sandboxSelector).remove();
    });

    describe('Views', function() {
        describe('AnalysisResultView', function() {
            _.each(['land', 'soil', 'animals', 'pointsource'], testAnalysisType);
        });
    });
});

function testAnalysisType(type) {
    it('tests ' + type + ' analysis renders as expected', function(done) {
        var sandbox = new SandboxRegion(),
            result = new models.LayerModel(_.find(mocks.results, { name: type })),
            resultView = new views.AnalyzeResultViews[type]({
                model: result
            });

        resultView.listenTo(resultView, 'show', function() {
            var expectedTableHeaders = tableHeaders[type],
                expectedTableRows = tableRows(type, result),
                actualTableHeaders = $('table thead th').map(function() {
                    return $(this).text().trim();
                }).toArray(),
                actualTableRows = $('table tbody td').map(function() {
                    return $(this).text().trim();
                }).toArray();

            assert.deepEqual(expectedTableHeaders, actualTableHeaders);
            assert.deepEqual(expectedTableRows, actualTableRows);

            done();
        });

        sandbox.show(resultView);
    });
}

function landTableFormatter(categories) {
    var collection = new coreModels.LandUseCensusCollection(categories);

    return collection.map(function(category) {
        var name = category.get('type'),
            areaKm2 = coreUtils.changeOfAreaUnits(category.get('area'),
                                                  'm<sup>2</sup>',
                                                  'km<sup>2</sup>'),
            coverage = category.get('coverage') * 100;

        return [name, areaKm2.toFixed(2), coverage.toFixed(1)];
    });
}

function soilTableFormatter(categories) {
    var collection = new coreModels.SoilCensusCollection(categories);

    return collection.map(function(category) {
        var name = category.get('type'),
            areaKm2 = coreUtils.changeOfAreaUnits(category.get('area'),
                'm<sup>2</sup>',
                'km<sup>2</sup>'),
            coverage = category.get('coverage') * 100;

        return [name, areaKm2.toFixed(2), coverage.toFixed(1)];
    });
}

function animalTableFormatter(categories) {
    var collection = new coreModels.AnimalCensusCollection(categories);

    return collection.map(function(category) {
        var name = category.get('type'),
            aeu = category.get('aeu').toLocaleString();

        return [name, aeu];
    });
}

function pointsourceTableFormatter(categories) {
    var collection = new coreModels.PointSourceCensusCollection(categories);

    return collection.map(function(category) {
        var code = category.get('npdes_id'),
            city = coreUtils.toTitleCase(category.get('city')),
            discharge = category.get('mgd') === null ? 'No Data' : category.get('mgd').toLocaleString(),
            tn_load = category.get('kgn_yr') === null ? 'No Data' : category.get('kgn_yr').toLocaleString(),
            tp_load = category.get('kgp_yr') === null ? 'No Data' : category.get('kgp_yr').toLocaleString();

        return [code, city, discharge, tn_load, tp_load];
    });
}

var dataFormatters = {
    land: landTableFormatter,
    soil: soilTableFormatter,
    animals: animalTableFormatter,
    pointsource: pointsourceTableFormatter,
};

var tableHeaders = {
    land: ['Type', 'Area (km2)', 'Coverage (%)'],
    soil: ['Type', 'Area (km2)', 'Coverage (%)'],
    animals: ['Animal', 'Count'],
    pointsource: ['Code', 'City', 'Discharge (MGD)', 'TN Load (kg/yr)', 'TP Load (kg/yr)'],
};

function tableRows(type, result) {
    var formatter = dataFormatters[type];

    return _.flatten(formatter(result.get('categories')));
}
