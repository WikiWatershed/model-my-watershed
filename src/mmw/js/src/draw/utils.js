"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    _ = require('lodash'),
    JSZip = require('jszip'),
    turfArea = require('turf-area'),
    turfBboxPolygon = require('turf-bbox-polygon'),
    coreUtils = require('../core/utils');

// Keep in sync with src/api/main.py in rapid-watershed-delineation.
var MAX_AREA = 75000; // About the size of West Virginia (in km^2)

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

function getGeoJsonLatLngs(shape) {
    if (shape.coordinates) {
        return L.GeoJSON.coordsToLatLngs(shape.coordinates, 2);
    } else if (shape.geometry) {
        return L.GeoJSON.coordsToLatLngs(shape.geometry.coordinates, 1);
    } else if (shape.features) {
        var coordinates = [];
        _.forEach(shape.features, function(feature) {
            coordinates.push(feature.geometry.coordinates);
        });
        return L.GeoJSON.coordsToLatLngs(coordinates, 2);
    }
    return null;
}

// Return shape area in km2.
function shapeArea(shape) {
    return coreUtils.changeOfAreaUnits(turfArea(shape),
            'm<sup>2</sup>', 'km<sup>2</sup>');
}

// Get the bounding box of the shape and return its area in km2
function shapeBoundingBoxArea(shape) {
    var shapeLatLngPoints = getGeoJsonLatLngs(shape),
        latLngBounds = L.latLngBounds(shapeLatLngPoints),
        boundingBox = [
            latLngBounds.getWest(),
            latLngBounds.getSouth(),
            latLngBounds.getEast(),
            latLngBounds.getNorth()
        ],
        boundingBoxPolygon = turfBboxPolygon(boundingBox);
    return shapeArea(boundingBoxPolygon);
}

function getShpFileFromZipObjects(zipObjects) {
    return _.find(zipObjects.files, function(zipObject) {
        return zipObject.name.substr(zipObject.name.lastIndexOf(".") + 1)
            .toLowerCase() === 'shp';
    });
}

function loadAsyncShpFileFromZip(zipfile) {
    return JSZip.loadAsync(zipfile)
        .then(function(zipObjects) {
            var shpFileZipObject = getShpFileFromZipObjects(zipObjects);
            return zipObjects.file(shpFileZipObject.name).async("arraybuffer");
        });
}

function isValidForAnalysis(shape) {
    if (shape) {
        var area = shapeBoundingBoxArea(shape);
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
    shapeBoundingBoxArea: shapeBoundingBoxArea,
    isValidForAnalysis: isValidForAnalysis,
    loadAsyncShpFileFromZip: loadAsyncShpFileFromZip,
    NHD: 'nhd',
    DRB: 'drb',
    MAX_AREA: MAX_AREA
};
