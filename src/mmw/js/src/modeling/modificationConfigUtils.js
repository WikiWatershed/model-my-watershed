"use strict";

var modificationConfig = require('./modificationConfig');

function getHumanReadableLabel(value) {
    if (modificationConfig[value]) {
        return modificationConfig[value].name;
    } else {
        throw 'Unknown Land Cover or Conservation Practice: ' + value;
    }
}

function getHumanReadableSummary(value) {
    if (modificationConfig[value]) {
        return modificationConfig[value].summary || '';
    } else {
        throw 'Unknown Land Cover or Conservation Practice: ' + value;
    }
}

var getDrawOpts = function(pattern) {
    if (pattern && modificationConfig[pattern] && modificationConfig[pattern].color) {
        return {
            color: modificationConfig[pattern].color,
            opacity: 1,
            weight: 3,
            fillColor: 'url(#fill-' + pattern + ')',
            fillOpacity: 0.74
        };
    } else {
        // Unknown pattern, return generic grey
        return {
            color: '#888',
            opacity: 1,
            weight: 3,
            fillColor: '#888',
            fillOpacity: 0.74
        };
    }
};

module.exports = {
    getHumanReadableLabel: getHumanReadableLabel,
    getHumanReadableSummary: getHumanReadableSummary,
    getDrawOpts: getDrawOpts
};
