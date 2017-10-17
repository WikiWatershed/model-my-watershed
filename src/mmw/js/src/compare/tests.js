"use strict";

require('../core/setup');

var _ = require('lodash'),
    assert = require('chai').assert,
    mocks = require('../modeling/mocks'),
    modelingModels = require('../modeling/models'),
    views = require('./views'),
    App = require('../app.js'),
    testUtils = require('../core/testUtils');

describe('Compare', function() {
    beforeEach(function() {
        // ScenarioModel.initialize() expects
        // App.currentProject to be set, and uses it to determine the
        // taskModel and modelPackage to use.
        App.currentProject = new modelingModels.ProjectModel();

        var sqKm = {"type":"MultiPolygon","coordinates":[[[[-75.16779683695418,39.93578257350401],[-75.15607096089737,39.93578257350401],[-75.15607096089737,39.94477296727664],[-75.16779683695418,39.94477296727664],[-75.16779683695418,39.93578257350401]]]]};

        // The water quality charts expect an area of
        // interest for the AoIVolumeModel to use
        App.currentProject.set('area_of_interest', sqKm);
    });

    afterEach(function() {
        testUtils.resetApp(App);
    });

    describe('Models', function() {
        describe('Tr55RunoffCharts', function() {
            beforeEach(function() {
                this.scenarios = getTestScenarioCollection();
                this.chartRows = views.getTr55Tabs(this.scenarios)
                                      .findWhere({ name: 'Runoff' })
                                      .get('charts');
            });

            describe('#update', function() {
                it('uses precolumbian results for Predominantly Forested scenario',
                   function() {
                       var precolumbianResult =
                               this.scenarios
                                   .findWhere({ is_pre_columbian: true })
                                   .get('results')
                                   .findWhere({ name: 'runoff' })
                                   .get('result'),
                           precolumbianValue =
                               precolumbianResult.runoff['pc_unmodified'];

                       this.chartRows.update();

                       this.chartRows.forEach(function(chart) {
                           var forestValue = chart.get('values')[0];
                           if (chart.get('key') === 'combined') {
                               assert.equal(forestValue, precolumbianValue);
                           } else {
                               assert.equal(forestValue,
                                            precolumbianValue[chart.get('key')]);
                           }
                       });
                   });

                it('uses unmodified results for current conditions scenario',
                   function() {
                       var unmodifiedResult =
                               this.scenarios
                                   .findWhere({ is_current_conditions: true })
                                   .get('results')
                                   .findWhere({ name: 'runoff' })
                                   .get('result'),
                           unmodifiedValue = unmodifiedResult.runoff['unmodified'];

                       this.chartRows.update();

                       this.chartRows.forEach(function(chart) {
                           var currentConditionsValue = chart.get('values')[1];
                           if (chart.get('key') === 'combined') {
                               assert.equal(currentConditionsValue,
                                            unmodifiedValue);
                           } else {
                               assert.equal(currentConditionsValue,
                                            unmodifiedValue[chart.get('key')]);
                           }
                       });
                   });

                it('uses modified results for user-created scenario',
                   function() {
                       var isUserCreated = function(scenario) {
                           return !scenario.get('is_current_conditions') &&
                                  !scenario.get('is_pre_columbian');
                       },

                           modifiedResult = this.scenarios
                                                .find(isUserCreated)
                                                .get('results')
                                                .findWhere({ name: 'runoff' })
                                                .get('result'),
                           modifiedValue = modifiedResult.runoff['modified'];

                       this.chartRows.update();

                       this.chartRows.forEach(function(chart) {
                           var value = chart.get('values')[2];
                           if (chart.get('key') === 'combined') {
                               assert.equal(value,
                                            modifiedValue);
                           } else {
                               assert.equal(value,
                                            modifiedValue[chart.get('key')]);
                           }
                       });
                   });
            });
        });

        describe('Tr55QualityCharts', function() {
            beforeEach(function() {
                this.scenarios = getTestScenarioCollection();
                this.chartRows = views.getTr55Tabs(this.scenarios)
                                      .findWhere({ name: 'Water Quality' })
                                      .get('charts');
            });

            describe('#update', function() {
                it('uses precolumbian results for Predominantly Forested scenario',
                   function() {
                       var precolumbianResult =
                               this.scenarios
                                   .findWhere({ is_pre_columbian: true })
                                   .get('results')
                                   .findWhere({ name: 'quality' })
                                   .get('result'),
                           precolumbianValue =
                               precolumbianResult.quality['pc_unmodified'],
                           aoivm = this.chartRows.aoiVolumeModel;

                       this.chartRows.update();

                       this.chartRows.forEach(function(chart) {
                           var name = chart.get('name'),
                               load = _.find(precolumbianValue,
                                             { measure: name }).load,
                               loadingRate = aoivm.getLoadingRate(load);

                           assert.equal(chart.get('values')[0],
                                        loadingRate);
                       });
                   });

                it('uses unmodified results for current conditions scenario',
                   function() {
                       var unmodifiedResult =
                               this.scenarios
                                   .findWhere({ is_current_conditions: true })
                                   .get('results')
                                   .findWhere({ name: 'quality' })
                                   .get('result'),
                           unmodifiedValue = unmodifiedResult.quality['unmodified'],
                           aoivm = this.chartRows.aoiVolumeModel;

                       this.chartRows.update();

                       this.chartRows.forEach(function(chart) {
                           var name = chart.get('name'),
                               load = _.find(unmodifiedValue,
                                             { measure: name }).load,
                               loadingRate = aoivm.getLoadingRate(load);

                           assert.equal(chart.get('values')[1],
                                        loadingRate);

                       });
                   });

                it('uses modified results for user-created scenario',
                   function() {
                       var isUserCreated = function(scenario) {
                           return !scenario.get('is_current_conditions') &&
                                  !scenario.get('is_pre_columbian');
                       },

                           modifiedResult = this.scenarios
                                                .find(isUserCreated)
                                                .get('results')
                                                .findWhere({ name: 'quality' })
                                                .get('result'),
                           modifiedValue = modifiedResult.quality['modified'],
                           aoivm = this.chartRows.aoiVolumeModel;

                       this.chartRows.update();

                       this.chartRows.forEach(function(chart) {
                           var name = chart.get('name'),
                               load = _.find(modifiedValue,
                                             { measure: name }).load,
                               loadingRate = aoivm.getLoadingRate(load);

                           assert.equal(chart.get('values')[2],
                                        loadingRate);
                       });
                   });
            });
        });
    });
});

function getTestScenarioCollection() {
    var userScenario = new modelingModels.ScenarioModel(mocks.scenarios.sample),
        currentConditions = new modelingModels.ScenarioModel(mocks.scenarios.sample),
        forestCover = new modelingModels.ScenarioModel(mocks.scenarios.sample);

    userScenario.set('active', true);

    currentConditions.set({
        name: 'Current Conditions',
        id: 1,
        is_current_conditions: true,
    });

    forestCover.set({
        name: 'Predominantly Forested',
        id: 2,
        is_pre_columbian: true,
        is_current_conditions: false,
    });

    // Tests assume [0] == Predominantly Forested
    //              [1] == current conditions
    //              [2] == user's scenario
    return new modelingModels.ScenariosCollection([
        forestCover,
        currentConditions,
        userScenario
    ]);
}
