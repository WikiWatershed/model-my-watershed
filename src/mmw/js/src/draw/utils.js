"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    _ = require('lodash'),
    JSZip = require('jszip'),
    turfArea = require('turf-area'),
    turfBboxPolygon = require('turf-bbox-polygon'),
    turfDestination = require('turf-destination'),
    turfKinks = require('turf-kinks'),
    intersect = require('turf-intersect'),
    settings = require('../core/settings');

var CANCEL_DRAWING = 'CANCEL_DRAWING';

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

function shapeBoundingBox(shape) {
    return L.latLngBounds(getGeoJsonLatLngs(shape));
}

// Get the bounding box of the shape and return its area in m²
function shapeBoundingBoxArea(shape) {
    var latLngBounds = shapeBoundingBox(shape),
        boundingBox = [
            latLngBounds.getWest(),
            latLngBounds.getSouth(),
            latLngBounds.getEast(),
            latLngBounds.getNorth()
        ],
        boundingBoxPolygon = turfBboxPolygon(boundingBox);

    return turfArea(boundingBoxPolygon);
}

// Given a point, returns a 1 KM Square bounding box around it
function getSquareKmBoxForPoint(point) {
    var halfKmbufferPoints = _.map([-180, -90, 0, 90], function(bearing) {
            var p = turfDestination(point, 0.5, bearing, 'kilometers');
            return L.latLng(p.geometry.coordinates[1], p.geometry.coordinates[0]);
        }),
        // Convert the four points into two SW and NE for the bounding
        // box. South-west has the lat from 0, lng from 1, North-east has
        // the lat from 2, lng from 3.
        swNe = [
            L.latLng(halfKmbufferPoints[0].lat, halfKmbufferPoints[1].lng),
            L.latLng(halfKmbufferPoints[2].lat, halfKmbufferPoints[3].lng),
        ],
        bounds = L.latLngBounds(swNe),
        box = turfBboxPolygon(bounds.toBBoxString().split(','));

    // Convert coordinates from using strings to floats so that backend can parse them.
    box.geometry.coordinates[0] = _.map(box.geometry.coordinates[0], function(coord) {
        return [parseFloat(coord[0]), parseFloat(coord[1])];
    });

    return box;
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

function isSelfIntersecting(shape) {
    var selfIntersects = function(polygon) {
            return turfKinks(polygon).features.length > 0;
        },
        geom = shape.geometry || shape;

    if (!geom) {
        return false;
    }

    if (geom.type === "Polygon") {
        // turfKinks will include polgyons' self-touching rings
        // as kinks, but shapes with self-touching rings are
        // valid for geoprocessing.
        // Assert only that each polygon ring doesn't intersect
        // itself
        return _.some(geom.coordinates, function(linearRing) {
            return selfIntersects({
                type: "Polygon",
                coordinates: [linearRing],
            });
        });
    }

    return selfIntersects(geom);
}

function isValidForAnalysis(shape) {
    if (shape) {
        var area = shapeBoundingBoxArea(shape),
            maxArea = settings.get('max_area');

        return area > 0 && area <= maxArea;
    }
    return false;
}

function withinConus(shape) {
    return intersect(settings.get('conus_perimeter'), shape);
}

function getPolygonFromGeoJson(geojson) {
    var polygon = null;

    if (geojson === null) {
        return null;
    }

    if (geojson.coordinates) {
        polygon = geojson;
    } else if (geojson.geometry) {
        polygon = geojson.geometry;
    } else if (geojson.features &&
               _.isArray(geojson.features) &&
               geojson.features[0] &&
               geojson.features[0].geometry) {

        polygon = geojson.features[0].geometry;
    }

    if (polygon.type && (
        polygon.type === "MultiPolygon" ||
        polygon.type === "Polygon")) {

        return polygon;
    } else {
        return null;
    }
}

module.exports = {
    drawPolygon: drawPolygon,
    placeMarker: placeMarker,
    createRwdMarkerIcon: createRwdMarkerIcon,
    cancelDrawing: cancelDrawing,
    polygonDefaults: polygonDefaults,
    shapeBoundingBox: shapeBoundingBox,
    shapeBoundingBoxArea: shapeBoundingBoxArea,
    isSelfIntersecting: isSelfIntersecting,
    isValidForAnalysis: isValidForAnalysis,
    withinConus: withinConus,
    getPolygonFromGeoJson: getPolygonFromGeoJson,
    getSquareKmBoxForPoint: getSquareKmBoxForPoint,
    loadAsyncShpFilesFromZip: loadAsyncShpFilesFromZip,
    NHD: 'nhd',
    NHDHR: 'nhdhr',
    DRB: 'drb',
    CANCEL_DRAWING: CANCEL_DRAWING,
    POINT: 'point',
    STREAM: 'stream',
    RWD: 'rwd',
};
