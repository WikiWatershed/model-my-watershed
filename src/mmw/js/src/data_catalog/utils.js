"use strict";

var L = require('leaflet'),
    turfArea = require('turf-area');

var SQKM_PER_SQM = 0.000001;

// Find area of given LatLngBounds
function areaOfBounds(bounds) {
    var area = turfArea(L.rectangle(bounds).toGeoJSON());

    return area * SQKM_PER_SQM;
}

module.exports = {
    areaOfBounds: areaOfBounds,
};
