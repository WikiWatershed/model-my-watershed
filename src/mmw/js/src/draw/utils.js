"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    _ = require('lodash'),
    turfArea = require('turf-area'),
    coreUtils = require('../core/utils');

// Keep in sync with src/api/main.py in rapid-watershed-delineation.
var MAX_AREA = 112700; // About the size of a large state (in km^2)

var polygonDefaults = {
        fillColor: '#E77471',
        color: '#E77471'
    };

function drawPolygon(map, drawOpts) {
    var defer = $.Deferred(),
        tool = new L.Draw.Polygon(map, {
            allowIntersection: false,
            shapeOptions: _.defaults(drawOpts || {}, polygonDefaults)
        }),
        clearEvents = function() {
            map.off('draw:created');
            map.off('draw:drawstop');
        },
        drawCreated = function(e) {
            var layer = e.layer,
                shape = layer.toGeoJSON();
            clearEvents();
            defer.resolve(shape);
        },
        drawStop = function() {
            tool.disable();
            clearEvents();
            defer.reject();
        };

    cancelDrawing(map);

    map.on('draw:created', drawCreated);
    map.on('draw:drawstop', drawStop);
    tool.enable();

    return defer.promise();
}

function placeMarker(map, drawOpts) {
    var defer = $.Deferred(),
        tool = new L.Draw.Marker(map, { shapeOptions: drawOpts || {}}),
        clearEvents = function() {
            map.off('draw:created');
            map.off('draw:drawstop');
        },
        drawCreated = function(e) {
            var latlng = e.layer.getLatLng();
            clearEvents();
            defer.resolve(latlng);
        },
        drawStop = function() {
            tool.disable();
            clearEvents();
            defer.reject();
        };

    cancelDrawing(map);

    map.on('draw:created', drawCreated);
    map.on('draw:drawstop', drawStop);
    tool.enable();

    return defer.promise();
}

function createRwdMarkerIcon(iconName) {
    return L.divIcon({
        className: 'marker-rwd marker-rwd-' + iconName,
        iconSize: [16,16]
    });
}

// Cancel any previous draw action in progress.
function cancelDrawing(map) {
    map.fire('draw:drawstop');
}

// Return shape area in km2.
function shapeArea(shape) {
    return coreUtils.changeOfAreaUnits(turfArea(shape),
            'm<sup>2</sup>', 'km<sup>2</sup>');
}

function isValidForAnalysis(shape) {
    if (shape) {
        var area = shapeArea(shape);
        return area > 0 && area <= MAX_AREA;
    }
    return false;
}

module.exports = {
    drawPolygon: drawPolygon,
    placeMarker: placeMarker,
    createRwdMarkerIcon: createRwdMarkerIcon,
    cancelDrawing: cancelDrawing,
    polygonDefaults: polygonDefaults,
    shapeArea: shapeArea,
    isValidForAnalysis: isValidForAnalysis,
    NHD: 'nhd',
    DRB: 'drb',
    MAX_AREA: MAX_AREA
};
