"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    views = require('./views');

var TEST_SHAPE = {
    'type': 'Feature',
    'geometry': {
        'type': 'Polygon',
        'coordinates': [[[-5e6, -1e6], [-4e6, 1e6], [-3e6, -1e6]]]
    }
};

var SandboxRegion = Marionette.Region.extend({
    el: '#sandbox'
});

suite('Draw', function() {
    beforeEach(function() {
        $('body').append('<div id="sandbox">');
    });

    afterEach(function() {
        $('#sandbox').remove();
    });

    // Setup the toolbar controls, enable/disable them, and verify
    // the correct CSS classes are applied.
    test('Can enable/disable toolbar controls', function() {
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

    // Simulate clicking a predefined shape in the "Select Area"
    // control. That should fetch a polygon GeoJSON from the API
    // and update the `areaOfInterest` property on the map model.
    test('Controls update the map', function() {
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

        assert.equal(App.map.get('areaOfInterest'), TEST_SHAPE);
    });
});

function assertTextEqual($el, sel, text) {
    assert.equal($el.find(sel).text().trim(), text);
}

function populateSelectAreaDropdown($el, toolbarModel) {
    // This control should start off in a Loading state.
    assertTextEqual($el, '#select-area-region button', 'Loading...');

    // Load some shapes...
    toolbarModel.set('predefinedShapes', [
        { id: 0, name: 'Test Shape' }
    ]);

    // This dropdown should now be populated.
    assertTextEqual($el, '#select-area-region button', 'Select Area');
    assertTextEqual($el, '#select-area-region li', 'Test Shape');
}
