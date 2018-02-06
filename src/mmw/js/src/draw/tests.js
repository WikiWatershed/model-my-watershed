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
    },
    TEST_MULTIPOLYGON = TEST_SHAPE,
    TEST_TOUCHING_RING_POLYGON = {
        "type": "Polygon",
        "coordinates": [[
                [-81.1334565281868, 34.5155012452405],
                [-81.13281011581421, 34.51532885979015],
                [-81.13242119550705, 34.516444938757026],
                [-81.13294959068298, 34.515963148086456],
                [-81.13310515880585, 34.5165200801701],
                [-81.1334565281868, 34.5155012452405]], [
                [-81.13294959068298, 34.515963148086456],
                [-81.13285839557648, 34.515850435187986],
                [-81.13307565450668, 34.51588137599882],
                [-81.13294959068298, 34.515963148086456]]]
    },
    TEST_SELF_INTERSECTING_POLYGON = {
        "type": "Polygon",
        "coordinates": [[
                [-81.13367110490799, 34.51589463634283],
                [-81.13365232944489, 34.51609133119742],
                [-81.13351553678513, 34.51586148547889],
                [-81.1334753036499, 34.51606481056996],
                [-81.13367110490799, 34.51589463634283]]]
    },
    TEST_POLYGON = (function() {
                        var x = _.clone(TEST_SHAPE);
                        x.type = 'Polygon';
                        return x; })(),
    TEST_FEATURE = {
        'type': 'Feature',
        'properties': {},
        'geometry': TEST_MULTIPOLYGON,
    },
    TEST_FEATURECOLLECTION = {
        'type': 'FeatureCollection',
        'features': [TEST_FEATURE],
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

        // add Conus perimeter to settings; this is a very rough box for brevity
        settings.set('conus_perimeter', {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'Polygon',
                'coordinates': [
                    [
                        [
                            -124.541015625,
                            24.44714958973082
                        ],
                        [
                            -61.87499999999999,
                            24.44714958973082
                        ],
                        [
                            -61.87499999999999,
                            48.86471476180277
                        ],
                        [
                            -124.541015625,
                            48.86471476180277
                        ],
                        [
                            -124.541015625,
                            24.44714958973082
                        ]
                    ]
                ]
            }
        });
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
        it('open draw-tool-selection in correct place when activeDrawToolItem is set ', function() {
            var sandbox = new SandboxRegion(),
                $el = sandbox.$el,
                model = new models.ToolbarModel(),
                view = new views.DrawWindow({
                    model: model
                });

            model.set('predefinedShapeTypes', [
                {
                    code: 'huc8',
                    display: 'title',
                    helptext: 'helptext',
                    minZoom: 0
                }
            ]);

            sandbox.show(view);
            assertDrawToolIsVisible($el, null);

            model.set({
                activeDrawTool: views.selectBoundary,
                activeDrawToolItem: 'huc8'
            });
            assertDrawToolIsVisible($el, '#select-boundary-region');

            model.set({
                activeDrawTool: views.drawArea,
                activeDrawToolItem: views.freeDraw
            });
            assertDrawToolIsVisible($el, '#draw-area-region');

            model.set({
                activeDrawTool: views.delineateWatershed,
                activeDrawToolItem: utils.DRB,
            });
            assertDrawToolIsVisible($el, '#watershed-delineation-region');

            model.set({
                activeDrawTool: null,
                activeDrawToolItem: null
            });
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

    describe('DrawUtils', function() {
        it ('parses GeoJSON correctly', function() {
            var parse = utils.getPolygonFromGeoJson;

            assert.equal(parse(TEST_POLYGON), TEST_POLYGON);
            assert.equal(parse(TEST_MULTIPOLYGON), TEST_MULTIPOLYGON);
            assert.equal(parse(TEST_FEATURE), TEST_MULTIPOLYGON);
            assert.equal(parse(TEST_FEATURECOLLECTION), TEST_MULTIPOLYGON);
        });

        it ('finds self-intersections', function() {
            var isSelfIntersecting = utils.isSelfIntersecting;

            assert.equal(isSelfIntersecting(TEST_POLYGON), false,
                         'found intersections in polygon where there were none');
            assert.equal(isSelfIntersecting(TEST_MULTIPOLYGON), false,
                         'found intersections in multipolygon where there were none');
            assert.equal(isSelfIntersecting(TEST_FEATURE), false,
                         'found intersections in feature multipolygon where there were none');
            assert.equal(isSelfIntersecting(TEST_TOUCHING_RING_POLYGON), false,
                         'found intersections in polygon with self-touching rings');

            assert.equal(isSelfIntersecting(TEST_SELF_INTERSECTING_POLYGON), true,
                         'did not find intersections in intersecting polygon');
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
    var regions = ['#select-boundary-region', '#draw-region', '#place-marker-region'],
        inactiveRegions = drawToolRegion ? _.without(regions, drawToolRegion) : regions;

    if (drawToolRegion) {
        assert.equal($el.find(drawToolRegion + ' .draw-tool-selection').length, 1);
    }

    _.each(inactiveRegions, function (inactiveDrawToolRegion) {
        assert.equal($el.find(inactiveDrawToolRegion + ' .draw-tool-region').length, 0);
    });
}
