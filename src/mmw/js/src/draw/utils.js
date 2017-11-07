"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    _ = require('lodash'),
    JSZip = require('jszip'),
    turfArea = require('turf-area'),
    turfBboxPolygon = require('turf-bbox-polygon'),
    coreUtils = require('../core/utils'),
    intersect = require('turf-intersect'),
    settings = require('../core/settings');

var CANCEL_DRAWING = 'CANCEL_DRAWING';

var MAX_AREA = settings.get('max_area');

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
            defer.reject(CANCEL_DRAWING);
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
            defer.reject(CANCEL_DRAWING);
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
    var nesting = 1;

    if (shape.coordinates) {
        nesting = shape.type === "MultiPolygon" ? 2 : 1;
        return L.GeoJSON.coordsToLatLngs(shape.coordinates, nesting);
    } else if (shape.geometry) {
        nesting = shape.geometry.type === "MultiPolygon" ? 2 : 1;
        return L.GeoJSON.coordsToLatLngs(shape.geometry.coordinates, nesting);
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

function shapeBoundingBox(shape) {
    return L.latLngBounds(getGeoJsonLatLngs(shape));
}

// Get the bounding box of the shape and return its area in km2
function shapeBoundingBoxArea(shape) {
    var latLngBounds = shapeBoundingBox(shape),
        boundingBox = [
            latLngBounds.getWest(),
            latLngBounds.getSouth(),
            latLngBounds.getEast(),
            latLngBounds.getNorth()
        ],
        boundingBoxPolygon = turfBboxPolygon(boundingBox);
    return shapeArea(boundingBoxPolygon);
}

function getFileFromZipObjects(zipObjects, extension) {
    return _.find(zipObjects.files, function(zipObject) {
        var fileExtension = zipObject.name.substr(zipObject.name.lastIndexOf(".") + 1);
        return fileExtension.toLowerCase() === extension;
    });
}

function loadAsyncShpFilesFromZip(zipfile) {
    return JSZip.loadAsync(zipfile)
        .then(function(zipObjects) {
            var shpFileZipObject = getFileFromZipObjects(zipObjects, 'shp'),
                prjFileZipObject = getFileFromZipObjects(zipObjects, 'prj');

                if (!shpFileZipObject) {
                    throw "Zip file must contain a .shp file.";
                }

                if (!prjFileZipObject) {
                    throw "Zip file must contain a .prj file.";
                }

            var shpPromise = zipObjects.file(shpFileZipObject.name).async("arraybuffer"),
                prjPromise = zipObjects.file(prjFileZipObject.name).async("string");

            return JSZip.external.Promise.all([shpPromise, prjPromise]);
        });
}

function isValidForAnalysis(shape) {
    if (shape) {
        var area = shapeBoundingBoxArea(shape);
        return area > 0 && area <= MAX_AREA;
    }
    return false;
}

function withinConus(shape) {
    return intersect(settings.get('conus_perimeter'), shape);
}

module.exports = {
    drawPolygon: drawPolygon,
    placeMarker: placeMarker,
    createRwdMarkerIcon: createRwdMarkerIcon,
    cancelDrawing: cancelDrawing,
    polygonDefaults: polygonDefaults,
    shapeBoundingBox: shapeBoundingBox,
    shapeBoundingBoxArea: shapeBoundingBoxArea,
    isValidForAnalysis: isValidForAnalysis,
    withinConus: withinConus,
    loadAsyncShpFilesFromZip: loadAsyncShpFilesFromZip,
    NHD: 'nhd',
    DRB: 'drb',
    CANCEL_DRAWING: CANCEL_DRAWING,
    MAX_AREA: MAX_AREA
};
