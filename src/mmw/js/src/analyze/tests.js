"use strict";

require('../core/testInit.js');

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    sinon = require('sinon'),
    models = require('./models'),
    views = require('./views'),
    chart = require('../core/chart'),
    sandboxTemplate = require('../core/templates/sandbox.html');

var sandboxHeight = '500',
    sandboxWidth = '700',
    sandboxSelector = '#display-sandbox';

var SandboxRegion = Marionette.Region.extend({
    el: '#display-sandbox'
});

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

describe('Analyze', function() {
    beforeEach(function() {
        $('#display-sandbox').remove();
        // Use a special sandbox so that we can test responsiveness of chart.
        $('body').append(sandboxTemplate({height: sandboxHeight, width: sandboxWidth}));
    });

    afterEach(function() {
        $('#display-sandbox').remove();
    });

    describe('AnalyzeView', function() {
        beforeEach(function() {
            this.server = sinon.fakeServer.create();
            this.server.respondImmediately = true;
        });

        afterEach(function() {
            $('#display-sandbox').empty();
            this.server.restore();
        });

        for (var dataSetInd = 0; dataSetInd < analyzeDataSets.length; dataSetInd++) {
            var dataSet = analyzeDataSets[dataSetInd];

            it('renders tables that match the data when there are ' + dataSetInd + ' categories in the dataset', function() {
                var view = setupAnalyzeView(analyzeDataSets[dataSetInd], this.server);
                view.listenTo(view, 'show', function() {
                    checkTable(dataSet);
                });
            });

            it('renders charts that match the data when there are ' + dataSetInd + ' categories in the dataset', function() {
                var view = setupAnalyzeView(analyzeDataSets[dataSetInd], this.server);
                view.listenTo(view, 'show', function() {
                    checkChart(dataSet);
                });
            });
        }
    });
});

function setupAnalyzeView(data, server) {
    var sandbox = new SandboxRegion(),
        view = new views.AnalyzeWindow({
            id: 'analyze-output-wrapper',
            model: new models.LayerCollection({})
        }),
        jobId = "abc",
        startResponse = JSON.stringify({
            "status": "started",
            "job": jobId
        }),
        endResponse = JSON.stringify({
            "status": "complete",
            "result": data
        });

    server.respondWith('/api/modeling/start/analyze', startResponse);
    server.respondWith('/api/modeling/job/' + jobId, endResponse);
    sandbox.show(view);
    return view;
};

function checkTable(data) {
    _.each(data, function(subData) {
        checkTableHeader(subData.name);
        checkTableBody(subData);
    });
};

function checkTableHeader(name) {
    var expectedHeaderLabels = ['Type', 'Area', 'Coverage'];
    var headerLabels = $('#' + name + ' table thead tr th').map(function() {
        return $(this).text();
    }).get();
    assert.deepEqual(expectedHeaderLabels, headerLabels);
};

// Check that all elements in table match the dataset.
function checkTableBody(subData) {
    var $rows = $('#' + subData.name + ' table tbody tr');
    $rows.each(function(trInd, tr) {
        // Get elements in dataset into the order in which they are
        // displayed.
        var expectedRowVals = [
            subData.categories[trInd].type,
            subData.categories[trInd].area,
            subData.categories[trInd].coverage
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
        var axisLabels = $('#' + subData.name + ' .x.axis text').map(function() {
            return $(this).text();
        }).get();
        assert.deepEqual(expectedAxisLabels, axisLabels);

        var expectedNumBars = subData.categories.length;
        var numBars = $('#' + subData.name + ' .bar').length;
        assert.equal(expectedNumBars, numBars);
    });
};
