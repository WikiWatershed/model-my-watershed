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
            _.each(['land', 'soil', 'animals', 'pointsource', 'catchment_water_quality'], testAnalysisType);
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
            discharge = coreUtils.filterNoData(category.get('mgd')).toLocaleString(),
            tn_load = coreUtils.filterNoData(category.get('kgn_yr')).toLocaleString(),
            tp_load = coreUtils.filterNoData(category.get('kgp_yr')).toLocaleString();

        return [code, city, discharge, tn_load, tp_load];
    });
}

function catchmentWaterQualityTableFormatter(categories) {
    var collection = new coreModels.CatchmentWaterQualityCensusCollection(categories);
    return collection.map(function(category) {
        var nord = category.get('nord').toString(),
            areaha = coreUtils.filterNoData(category.get('areaha')).toLocaleString(),
            tn_tot_kgy = coreUtils.filterNoData((category.get('tn_tot_kgy')/category.get('areaha'))).toLocaleString(),
            tp_tot_kgy = coreUtils.filterNoData((category.get('tp_tot_kgy')/category.get('areaha'))).toLocaleString(),
            tss_tot_kg = coreUtils.filterNoData((category.get('tss_tot_kg')/category.get('areaha'))).toLocaleString();

        return [nord, areaha, tn_tot_kgy, tp_tot_kgy, tss_tot_kg];
    });
}

var dataFormatters = {
    land: landTableFormatter,
    soil: soilTableFormatter,
    animals: animalTableFormatter,
    pointsource: pointsourceTableFormatter,
    catchment_water_quality: catchmentWaterQualityTableFormatter,
};

var tableHeaders = {
    land: ['Type', 'Area (km2)', 'Coverage (%)'],
    soil: ['Type', 'Area (km2)', 'Coverage (%)'],
    animals: ['Animal', 'Count'],
    pointsource: ['NPDES Code', 'City', 'Discharge (MGD)', 'TN Load (kg/yr)', 'TP Load (kg/yr)'],
    catchment_water_quality: ['Id', 'Area (ha)', 'Total N (kg/ha)', 'Total P (kg/ha)', 'Total TSS (kg/ha)'],
};

function tableRows(type, result) {
    var formatter = dataFormatters[type];

    return _.flatten(formatter(result.get('categories')));
}
