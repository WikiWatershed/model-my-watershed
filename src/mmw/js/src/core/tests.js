"use strict";

var $ = require('jquery'),
    assert = require('chai').assert,
    App = require('../app');

var TEST_SHAPE = {
    'type': 'Feature',
    'geometry': {
        'type': 'Polygon',
        'coordinates': [[[-5e6, -1e6], [-4e6, 1e6], [-3e6, -1e6]]]
    }
};

suite('Core', function() {
    test('Updating map model adds Leaflet layers', function() {
        var mapView = App._mapView,
            featureGroup = mapView._areaOfInterestLayer;
        assert.equal(featureGroup.getLayers().length, 0);
        App.map.set('areaOfInterest', TEST_SHAPE);
        assert.equal(featureGroup.getLayers().length, 1);
        App.map.set('areaOfInterest', null);
        assert.equal(featureGroup.getLayers().length, 0);
    });
});
