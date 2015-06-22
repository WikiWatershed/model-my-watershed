"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    assert = require('chai').assert,
    sinon = require('sinon'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    utils = require('./utils'),
    views = require('./views');

var TEST_SHAPE = {
    'type': 'MultiPolygon',
    'coordinates': [[[-5e6, -1e6], [-4e6, 1e6], [-3e6, -1e6]]]
};

var SandboxRegion = Marionette.Region.extend({
    el: '#sandbox'
});

describe('Draw', function() {
    beforeEach(function() {
        $('body').append('<div id="sandbox">');
    });

    afterEach(function() {
        $('#sandbox').remove();
        window.location.hash = '';
    });

    describe('ToolbarView', function() {
        // Setup the toolbar controls, enable/disable them, and verify
        // the correct CSS classes are applied.
        it('enables/disables toolbar controls when the model enableTools/disableTools methods are called', function() {
            var sandbox = new SandboxRegion(),
                $el = sandbox.$el,
                model = new models.ToolbarModel(),
                view = new views.ToolbarView({
                    model: model
                });

            sandbox.show(view);
            populateSelectAreaDropdown($el, model);

            // Nothing should be disabled at this point.
            // Test that toggling the `toolsEnabled` property on the model
            // will disable all drawing tools.
            assert.equal($el.find('.disabled').size(), 0);
            model.disableTools();
            assert.equal($el.find('.disabled').size(), 3);
            model.enableTools();
            assert.equal($el.find('.disabled').size(), 0);
        });

        // Simulate clicking on an item under the "Select by Boundary"
        // control. That should make it possible to select an area of
        // interest by clicking on the map.
        it('adds a layer to the map when an area of interest is chosen by clicking on the map', function() {
            var sandbox = new SandboxRegion(),
                $el = sandbox.$el,
                model = new models.ToolbarModel(),
                view = new views.ToolbarView({
                    model: model
                });

            sandbox.show(view);
            populateSelectAreaDropdown($el, model);

            App.restApi = {
                getPolygon: function() {
                    return $.Deferred().resolve(TEST_SHAPE).promise();
                }
            };

            var $li = $($el.find('#select-area-region li a').get(0));
            $li.trigger('click');
            App.getLeafletMap().fireEvent('click', {'latlng': [29.979, 31.134]});
            assert.equal(App.map.get('areaOfInterest'), TEST_SHAPE);
        });

        it('resets the current area of interest on Reset', function() {
            var setup = setupResetTestObject();

            App.map.set('areaOfInterest', TEST_SHAPE);
            setup.resetRegion.currentView.resetDrawingState();

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
            setup.resetRegion.currentView.resetDrawingState();
            assert.equal(ofg.getLayers().length, 0,
                'Boundary Layer should have been removed from layer group');
        });

        it('removes in progress drawing on Reset', function() {
            var setup = setupResetTestObject(),
                 spy = sinon.spy(utils, 'cancelDrawing');

            utils.drawPolygon(setup.map);
            setup.resetRegion.currentView.resetDrawingState();

            assert.equal(spy.callCount, 1);
        });
    });
});


function setupResetTestObject() {

    var sandbox = new SandboxRegion(),
        model = new models.ToolbarModel(),
        view = new views.ToolbarView({
            model: model
        }),
        resetRegion = view.getRegion('resetRegion'),
        map = App.getLeafletMap();

        sandbox.show(view);

    return {
        sandbox: sandbox,
        model: model,
        view: view,
        resetRegion: resetRegion,
        map: map
    };
}

function assertTextEqual($el, sel, text) {
    assert.equal($el.find(sel).text().trim(), text);
}

function populateSelectAreaDropdown($el, toolbarModel) {
    // This control should start off in a Loading state.
    assertTextEqual($el, '#select-area-region button', 'Loading...');

    // Load some shapes...
    toolbarModel.set('predefinedShapeTypes', [
    {
        "endpoint": "http://localhost:4000/0/{z}/{x}/{y}",
        "display": "Congressional Districts",
        "name": "tiles"
    }]);

    // This dropdown should now be populated.
    assertTextEqual($el, '#select-area-region button', 'Select by Boundary');
    assertTextEqual($el, '#select-area-region li', 'Congressional Districts');
}
