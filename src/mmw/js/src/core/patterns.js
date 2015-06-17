"use strict";

var colors = {
    // Land Cover
    'lir'        : '#329b9c',
    'hir'        : '#39afa1',
    'commercial' : '#40c2a8',
    'forest'     : '#53e9b4',
    'turf_grass' : '#4aeab3',
    'pasture'    : '#51dec2',
    'grassland'  : '#54d2d0',
    'row_crop'   : '#52c6dd',
    'wetland'    : '#4ebaea',

    // Conservation Practice
    'rain_garden'        : '#51dec2',
    'veg_infil_basin'    : '#52c6dd',
    'porous_paving'      : '#54d2d0',
    'green_roof'         : '#4ebaea',
    'no_till_agriculture': '#53e9b4',
    'cluster_housing'    : '#4aeab3'
};

var getDrawOpts = function(pattern) {
    if (!pattern || !colors[pattern]) {
        // Unknown pattern, return generic grey
        return {
            color: '#888',
            opacity: 1,
            weight: 3,
            fillColor: '#888',
            fillOpacity: 0.74
        };
    } else {
        return {
            color: colors[pattern],
            opacity: 1,
            weight: 3,
            fillColor: 'url(#fill-' + pattern + ')',
            fillOpacity: 0.74
        };
    }
};

module.exports = {
    getDrawOpts: getDrawOpts
};
