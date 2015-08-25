"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    sinon = require('sinon'),
    models = require('./models'),
    views = require('./views'),
    App = require('../app'),
    testUtils = require('../core/testUtils'),
    sandboxTemplate = require('../core/templates/sandbox.html');

var sandboxHeight = '500',
    sandboxWidth = '700',
    displaySandboxId = 'display-sandbox',
    displaySandboxSelector = '#' + displaySandboxId;

var SandboxRegion = Marionette.Region.extend({
    el: displaySandboxSelector
});

describe('Analyze', function() {
    beforeEach(function() {
        $(displaySandboxSelector).remove();
        // Use a special sandbox so that we can test responsiveness of chart.
        $('body').append(sandboxTemplate.render({height: sandboxHeight, width: sandboxWidth}));
    });

    afterEach(function() {
        testUtils.resetApp(App);
        $(displaySandboxSelector).remove();
    });

    describe('DetailsView', function() {
        beforeEach(function() {
            this.server = sinon.fakeServer.create();
            this.server.respondImmediately = true;
        });

        afterEach(function() {
            this.server.restore();
        });

        var analyzeDataSets = getTestAnalyzeData();

        function testDataSet(dataSetInd) {
            var dataSet = analyzeDataSets[dataSetInd];
            it('renders tables that match the data when there are ' + dataSetInd + ' categories in the dataset', function(done) {
                setupViewAndTest(dataSet, checkTable, done);
            });

            it('renders charts that match the data when there are ' + dataSetInd + ' categories in the dataset', function(done) {
                setupViewAndTest(dataSet, checkChart, done);
            });
        }

        _.forEach(_.range(3), function(dataSetInd) {
            testDataSet(dataSetInd);
        });
    });
});

function setupViewAndTest(dataSet, testFn, done) {
    var sandbox = new SandboxRegion(),
        view = new views.DetailsView({
            collection: new models.LayerCollection(dataSet)
        });
    view.listenTo(view, 'show', function() {
        testFn(dataSet);
        view.destroy();
        done();
    });
    sandbox.show(view);
}

function checkTable(data) {
    _.each(data, function(subData) {
        checkTableHeader(subData.name);
        checkTableBody(subData);
    });
}

function checkTableHeader(name) {
    var expectedHeaderLabels = ['Type', 'Area (m2)', 'Coverage (%)'];
    var headerLabels = $('#' + name + ' table thead tr th').map(function() {
        return $(this).text();
    }).get();
    assert.deepEqual(expectedHeaderLabels, headerLabels);
}

// Check that all elements in table match the dataset.
function checkTableBody(subData) {
    var $rows = $('#' + subData.name + ' table tbody tr');
    $rows.each(function(trInd, tr) {
        // Get elements in dataset into the order in which they are
        // displayed.
        var expectedRowVals = [
            subData.categories[trInd].type,
            subData.categories[trInd].area.toLocaleString('en'),
            (subData.categories[trInd].coverage * 100).toFixed(1)
        ];
        expectedRowVals = _.map(expectedRowVals, function(val) {
            return String(val);
        });
        var rowVals = $(tr).find('td').map(function(tdInd, td) {
            return $(td).text();
        }).get();
        assert.deepEqual(expectedRowVals, rowVals);
    });
}

// Check that bar chart has correct number of bars and correct
// x-axis labels.
function checkChart(data) {
    _.each(data, function(subData) {
        var expectedAxisLabels = _.pluck(subData.categories, 'type');
        var axisLabels = $('#' + subData.name + ' .x.axis .tick text').map(function() {
            return $(this).text();
        }).get();
        assert.deepEqual(expectedAxisLabels, axisLabels);

        var expectedNumBars = subData.categories.length;
        var numBars = $('#' + subData.name + ' .bar').length;
        assert.equal(expectedNumBars, numBars);
    });
}

function getTestAnalyzeData() {
    var analyzeDataSets = [
        [
            {
                "displayName":"Land",
                "name":"land",
                "categories":[]
            }
        ],
        [
            {
                "displayName":"Land",
                "name":"land",
                "categories":[
                    {
                        "type":"Developed: Open",
                        "coverage":0.263,
                        "area":5041
                    }
                ]
            }
        ],
        [
            {
                "displayName":"Land",
                "name":"land",
                "categories":[
                    {
                        "type":"Water",
                        "coverage":0.01,
                        "area":21
                    },
                    {
                        "type":"Developed: Open",
                        "coverage":0.263,
                        "area":5041
                    }
                ]
            },
            {
                "displayName":"Soil",
                "name":"soil",
                "categories":[
                    {
                        "type":"Clay",
                        "coverage":0.01,
                        "area":21
                    },
                    {
                        "type":"Silt",
                        "coverage":0.263,
                        "area":5041
                    }
                ]
            }
        ]
    ];

    return analyzeDataSets;
}
