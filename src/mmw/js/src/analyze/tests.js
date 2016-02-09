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
    var $rows = $('#' + subData.name + ' table tbody tr:not(.no-records-found)');

    $rows.each(function(trInd, tr) {
        // The bootstrap-table plugin creates rows containing no data,
        // which must be skipped.
        if ($(tr).find('td').length === 0) {
            return;
        }

        // Get elements in dataset into the order in which they are
        // displayed.
        var expectedRowVals = [
            subData.categories[trInd].type,
            subData.categories[trInd].area.toLocaleString('en', {minimumFractionDigits: 2}),
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
