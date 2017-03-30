"use strict";

require('../core/setup');

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    assert = require('chai').assert,
    sinon = require('sinon'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    utils = require('./utils'),
    views = require('./views'),
    settings = require('../core/settings'),
    testUtils = require('../core/testUtils');

var sandboxId = 'sandbox',
    sandboxSelector = '#' + sandboxId,
    // City Hall
    TEST_SHAPE = {
        'type': 'MultiPolygon',
        'coordinates': [[[
          [-75.16472339630127, 39.953446247674904],
          [-75.16255617141724, 39.95311727224624],
          [-75.16287803649902, 39.95161218948083],
          [-75.16518473625183, 39.95194939669509],
          [-75.16472339630127, 39.953446247674904]]]]
    };

var SandboxRegion = Marionette.Region.extend({
    el: sandboxSelector
});

describe('Draw', function() {
    before(function() {
        // Ensure that draw tools are enabled before testing

        settings.set('draw_tools', [
            'SelectArea',   // Boundary Selector
            'Draw',         // Custom Area or 1 Sq Km stamp
            'PlaceMarker',  // Delineate Watershed
            'ResetDraw',
        ]);
    });

    beforeEach(function() {
        $('body').append('<div id="sandbox">');
    });

    afterEach(function() {
        $(sandboxSelector).remove();
        window.location.hash = '';
        testUtils.resetApp(App);
    });

    describe('DrawWindow', function() {
        // Setup the toolbar controls, enable/disable them, and verify
        // the correct CSS classes are applied.
        it('toggles draw tools active and inactive when model.selectedDrawTool changes', function() {
            var sandbox = new SandboxRegion(),
                $el = sandbox.$el,
                model = new models.ToolbarModel(),
                view = new views.DrawWindow({
                    model: model
                }),
                selectedDrawTool = 'selectedDrawTool';

            sandbox.show(view);
            assertDrawToolIsVisible($el, null);
            view.model.set(selectedDrawTool, 'selectBoundary');
            assertDrawToolIsVisible($el, '#select-area-region');
            view.model.set(selectedDrawTool, 'drawArea');
            assertDrawToolIsVisible($el, '#draw-region');
            view.model.set(selectedDrawTool, 'delineateWatershed');
            assertDrawToolIsVisible($el, '#place-marker-region');
            view.model.set(selectedDrawTool, null);
            assertDrawToolIsVisible($el, null);
        });

        it('adds an AOI to the map after calling getShapeAndAnalyze', function(done) {
            var successCount = 2,
                deferred = setupGetShapeAndAnalyze(successCount),
                success;

            deferred.
                done(function() {
                    assert.equal(App.map.get('areaOfInterest'), TEST_SHAPE);
                    success = true;
                }).
                fail(function() {
                    success = false;
                }).
                always(function() {
                    assert.equal(success, true);
                    done();
                });
        });

        it('fails to add AOI when shape id cannot be retrieved by getShapeAndAnalyze', function(done) {
            // Set successCount high enough so that the polling will fail.
            var successCount = 6,
                deferred = setupGetShapeAndAnalyze(successCount),
                success;

            deferred.
                done(function() {
                    success = true;
                }).
                fail(function() {
                    success = false;
                }).
                always(function() {
                    assert.equal(success, false);
                    done();
                });
        });

        it('resets the current area of interest on Reset', function() {
            var setup = setupResetTestObject();

            App.map.set('areaOfInterest', TEST_SHAPE);
            setup.view.resetDrawingState();

            assert.isNull(App.map.get('areaOfInterest',
                                      'Area of Interest was not removed on reset from the map'));

        });

        it('resets the boundary layer on Reset', function() {
            var setup = setupResetTestObject(),
                ofg = L.featureGroup(),
                testFeature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-104.99404, 39.75621]
                    }
                };

            ofg.addLayer(L.geoJson(testFeature));
            assert.equal(ofg.getLayers().length, 1);

            setup.model.set('outlineFeatureGroup', ofg);
            setup.view.resetDrawingState();
            assert.equal(ofg.getLayers().length, 0,
                         'Boundary Layer should have been removed from layer group');
        });

        it('removes in progress drawing on Reset', function() {
            var setup = setupResetTestObject(),
                spy = sinon.spy(utils, 'cancelDrawing');

            utils.drawPolygon(setup.map);
            setup.view.resetDrawingState();

            assert.equal(spy.callCount, 1);
        });
    });
});

function setupGetShapeAndAnalyze(successCount) {
    var sandbox = new SandboxRegion(),
        model = new models.ToolbarModel(),
        view = new views.DrawWindow({
            model: model
        }),
        shapeId = 1,
        e = {latlng: L.latLng(50.5, 30.5)},
        ofg = model.get('outlineFeatureGroup'),
        grid = {
            callCount: 0,
            _objectForEvent: function() { //mock grid returns shapeId on second call
                this.callCount++;
                if (this.callCount >= successCount) {
                    return {data: {id: shapeId}};
                } else {
                    return {};
                }
            }
        },
        tableId = 2;

    sandbox.show(view);
    App.restApi = {
        getPolygon: function() {
            return $.Deferred().resolve(TEST_SHAPE).promise();
        }
    };

    return views.getShapeAndAnalyze(e, model, ofg, grid, tableId);
}

function setupResetTestObject() {
    var sandbox = new SandboxRegion(),
        model = new models.ToolbarModel(),
        view = new views.DrawWindow({
            model: model
        }),
        map = App.getLeafletMap();

        sandbox.show(view);

    return {
        sandbox: sandbox,
        model: model,
        view: view,
        map: map
    };
}

function assertDrawToolIsVisible($el, drawToolRegion) {
    var regions = ['#select-area-region', '#draw-region', '#place-marker-region'],
        inactiveRegions = drawToolRegion ? _.without(regions, drawToolRegion) : regions;

    if (drawToolRegion) {
        assert.equal($el.find(drawToolRegion).size(), 1);
    }

    _.each(inactiveRegions, function (inactiveDrawToolRegion) {
        assert.equal($el.find(inactiveDrawToolRegion).size(), 0);
    });
}
