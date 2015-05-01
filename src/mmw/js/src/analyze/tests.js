"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    sinon = require('sinon'),
    models = require('./models'),
    views = require('./views'),
    chart = require('./chart'),
    sandboxTemplate = require('./templates/sandbox.ejs');

var chartData = [{x: 'a', y: 1},
                {x: 'b', y: 2},
                {x: 'c', y: 3}],
    xValue = 'x',
    yValue = 'y',
    sandboxHeight = '500',
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

    describe('Chart', function() {
        beforeEach(function() {
        });

        afterEach(function() {
            $('#display-sandbox').empty();
        });

        it('changes size when the browser is resized and height and width are not provided', function() {
            chart.makeBarChart(sandboxSelector, chartData, xValue, yValue);
            var $svg = $(sandboxSelector).children('svg');

            var beforeHeight = $svg.attr('height');
            var beforeWidth = $svg.attr('width');
            assert.equal(sandboxHeight, beforeHeight);
            assert.equal(sandboxWidth, beforeWidth);

            var afterSandboxHeight = 300;
            var afterSandboxWidth = 400;
            $(sandboxSelector).css('height', afterSandboxHeight);
            $(sandboxSelector).css('width', afterSandboxWidth);
            $(window).trigger('resize');
            var afterHeight = $svg.attr('height');
            var afterWidth = $svg.attr('width');
            assert.equal(afterSandboxHeight, afterHeight);
            assert.equal(afterSandboxWidth, afterWidth);
        });

        it('stays the same size when the browser is resized and height and width are provided', function() {
            var options = {
                height: 400,
                width: 600
            };
            chart.makeBarChart(sandboxSelector, chartData, xValue, yValue, options);
            var $svg = $(sandboxSelector).children('svg');

            var beforeHeight = $svg.attr('height');
            var beforeWidth = $svg.attr('width');
            assert.equal(options.height, beforeHeight);
            assert.equal(options.width, beforeWidth);

            var afterSandboxHeight = 300;
            var afterSandboxWidth = 400;
            $(sandboxSelector).css('height', afterSandboxHeight);
            $(sandboxSelector).css('width', afterSandboxWidth);
            $(window).trigger('resize');
            var afterHeight = $svg.attr('height');
            var afterWidth = $svg.attr('width');
            assert.equal(options.height, afterHeight);
            assert.equal(options.width, afterWidth);
        });
    });

    suite('AnalyzeView', function() {
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

    server.respondWith('/api/analyze/start/analyze', startResponse);
    server.respondWith('/api/analyze/job/' + jobId, endResponse);
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
