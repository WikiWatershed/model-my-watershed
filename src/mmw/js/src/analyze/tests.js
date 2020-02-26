"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    coreModels = require('../core/models'),
    coreUtils = require('../core/utils'),
    settings = require('../core/settings'),
    coreUnits = require('../core/units'),
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

function renderPtSrcAndWQTableRowValue(n) {
    if (n && !_.isNaN(n)) {
        return Number(n.toFixed(3)).toLocaleString('en',
            { minimumFractionDigits: 3 });
    } else {
        return coreUtils.noData;
    }
}

describe('Analyze', function() {
    before(function() {
        if ($(sandboxSelector).length === 0) {
            $('<div>', {id: sandboxId}).appendTo('body');
        }

        settings.set('unit_scheme', coreUnits.UNIT_SCHEME.METRIC);
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
            _.forEach(['land', 'soil', 'animals', 'pointsource', 'catchment_water_quality'], testAnalysisType);
            testAnalysisType('protected_lands', 'land');
        });
    });
});

function testAnalysisType(type, taskGroupName) {
    it('tests ' + type + ' analysis renders as expected', function(done) {
        var sandbox = new SandboxRegion(),
            tgName = (typeof taskGroupName === 'string') ? taskGroupName : type,
            taskGroup = new models.AnalyzeTaskGroupModel(_.find(mocks.results, { name: tgName })),
            result = new models.LayerModel(taskGroup.get('tasks').findWhere({ name: type }).get('result').survey),
            resultView = new views.AnalyzeResultViews[type]({
                taskGroup: taskGroup,
                model: result
            });

        resultView.listenTo(resultView, 'show', function() {
            var expectedTableHeaders = tableHeaders[type],
                expectedTableRows = tableRows(type, result),
                actualTableHeaders = _.compact($('table thead th').map(function() {
                    if ($(this).hasClass('hidden-analyze-table-column')) {
                        return null;
                    }
                    return $(this).text().trim();
                }).toArray()),
                actualTableRows = _.compact($('table tbody td').map(function() {
                    if ($(this).hasClass('hidden-analyze-table-column')) {
                        return null;
                    }
                    return $(this).text().trim();
                }).toArray());

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
            areaKm2 = category.get('area') / coreUnits.METRIC.AREA_XL.factor,
            coverage = category.get('coverage') * 100,
            ara = category.get('active_river_area') / coreUnits.METRIC.AREA_XL.factor;

        return [
            name,
            areaKm2.toFixed(2),
            coverage.toFixed(2),
            ara.toFixed(2),
        ];
    });
}

function protectedLandsTableFormatter(categories) {
    var collection = new coreModels.ProtectedLandsCensusCollection(categories);

    return collection.map(function(category) {
        var name = category.get('type'),
            areaKm2 = category.get('area') / coreUnits.METRIC.AREA_XL.factor,
            coverage = category.get('coverage') * 100;

        return [name, areaKm2.toFixed(2), coverage.toFixed(2)];
    });
}

function soilTableFormatter(categories) {
    var collection = new coreModels.SoilCensusCollection(categories);

    return collection.map(function(category) {
        var name = category.get('type'),
            areaKm2 = category.get('area') / coreUnits.METRIC.AREA_XL.factor,
            coverage = category.get('coverage') * 100;

        return [name, areaKm2.toFixed(2), coverage.toFixed(2)];
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
            discharge = renderPtSrcAndWQTableRowValue(
                category.get('mgd') / coreUnits.METRIC.VOLUMETRICFLOWRATE.factor
            ),
            tn_load = renderPtSrcAndWQTableRowValue(category.get('kgn_yr')),
            tp_load = renderPtSrcAndWQTableRowValue(category.get('kgp_yr'));

        return [code, city, discharge, tn_load, tp_load];
    });
}

function catchmentWaterQualityTableFormatter(categories) {
    var collection = new coreModels.CatchmentWaterQualityCensusCollection(categories);
    return collection.map(function(category) {
        var nord = category.get('nord').toString(),
            areaha = renderPtSrcAndWQTableRowValue(category.get('areaha')),
            tn_tot_kgy = renderPtSrcAndWQTableRowValue(
                category.get('tn_tot_kgy')),
            tp_tot_kgy = renderPtSrcAndWQTableRowValue(
                category.get('tp_tot_kgy')),
            tss_tot_kg = renderPtSrcAndWQTableRowValue(
                category.get('tss_tot_kg')),
            tn_yr_avg_ = renderPtSrcAndWQTableRowValue(category.get('tn_yr_avg_')),
            tp_yr_avg_ = renderPtSrcAndWQTableRowValue(category.get('tp_yr_avg_')),
            tss_concmg = renderPtSrcAndWQTableRowValue(category.get('tss_concmg'));

        return [nord, areaha, tn_tot_kgy, tp_tot_kgy, tss_tot_kg, tn_yr_avg_,
            tp_yr_avg_, tss_concmg];
    });
}

var dataFormatters = {
    land: landTableFormatter,
    protected_lands: protectedLandsTableFormatter,
    soil: soilTableFormatter,
    animals: animalTableFormatter,
    pointsource: pointsourceTableFormatter,
    catchment_water_quality: catchmentWaterQualityTableFormatter,
};

var tableHeaders = {
    land: ['Type', 'Area (km²)', 'Coverage (%)', 'Active River Area (km²)'],
    protected_lands: ['Type', 'Area (km²)', 'Coverage (%)'],
    soil: ['Type', 'Area (km²)', 'Coverage (%)'],
    animals: ['Animal', 'Count'],
    pointsource: ['NPDES Code', 'City', 'Discharge (m³/d)', 'TN Load (kg/yr)', 'TP Load (kg/yr)'],
    catchment_water_quality: ['Id', 'Area (ha)', 'Total N (kg/ha)', 'Total P (kg/ha)',
        'Total SS (kg/ha)', 'Avg TN (mg/l)', 'Avg TP (mg/l)', 'Avg TSS (mg/l)'],
};

function tableRows(type, result) {
    var formatter = dataFormatters[type];

    return _.flatten(formatter(result.get('categories')));
}
