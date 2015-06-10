"use strict";

var $ = require('jquery'),
    L = require('leaflet');

function drawPolygon(map, drawOpts) {
    var defer = $.Deferred(),
        tool = new L.Draw.Polygon(map, { shapeOptions: drawOpts || {}}),
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

// Cancel any previous draw action in progress.
function cancelDrawing(map) {
    map.fire('draw:drawstop');
}

// TODO: Remove
function randomDrawOpts() {
    var dashes = [
        '5, 5',
        '5, 10',
        '10, 5',
        '5, 1',
        '1, 5',
        '0.9',
        '15, 10, 5',
        '15, 10, 5, 10',
        '15, 10, 5, 10, 15',
        '5, 5, 1, 5'
    ];

    function choice() {
        return arguments[Math.floor(Math.random() * arguments.length)];
    }

    return {
        clickable: false,
        color: '#' + choice('f', '0') + choice('f', '0') + choice('f', '0'),
        fillColor: '#' + choice('f', '0') + choice('f', '0') + choice('f', '0'),
        dashArray: choice.apply(null, dashes)
    };
}

module.exports = {
    drawPolygon: drawPolygon,
    placeMarker: placeMarker,
    cancelDrawing: cancelDrawing,
    randomDrawOpts: randomDrawOpts
};
