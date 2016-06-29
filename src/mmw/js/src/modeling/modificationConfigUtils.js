"use strict";

var modificationConfig = require('../core/modificationConfig.json');

// Useful for testing.
function setConfig(config) {
    modificationConfig = config;
}

function resetConfig() {
    modificationConfig = require('../core/modificationConfig.json');
}

function unknownModKey(modKey) {
    console.warn('Unknown Land Cover or Conservation Practice: ' + modKey);
    return '';
}

// modKey should be a key in modificationsConfig (eg. 'open_water').
function getHumanReadableName(modKey) {
    if (modificationConfig[modKey]) {
        return modificationConfig[modKey].name;
    }
    return unknownModKey(modKey);
}

// If no shortName, just use name.
function getHumanReadableShortName(modKey) {
    if (modificationConfig[modKey]) {
        if (modificationConfig[modKey].shortName) {
            return modificationConfig[modKey].shortName;
        } else {
            return modificationConfig[modKey].name;
        }
    }
    return unknownModKey(modKey);
}

function getHumanReadableSummary(modKey) {
    if (modificationConfig[modKey]) {
        return modificationConfig[modKey].summary || '';
    }
    return unknownModKey(modKey);
}

var getDrawOpts = function(modKey) {
    var defaultStyle = {
        color: '#888',
        opacity: 1,
        weight: 3,
        fillColor: '#888',
        fillOpacity: 0.74
    };

    if (modKey && modificationConfig[modKey]) {
        var config = modificationConfig[modKey];
        if (config.copyStyle) {
            return getDrawOpts(config.copyStyle);
        } else if (config.strokeColor){
            return {
                color: config.strokeColor,
                opacity: 1,
                weight: 3,
                fillColor: 'url(#fill-' + modKey + ')',
                fillOpacity: 0.74
            };
        } else {
            return defaultStyle;
        }
    } else {
        return defaultStyle;
    }
};

module.exports = {
    getHumanReadableName: getHumanReadableName,
    getHumanReadableShortName: getHumanReadableShortName,
    getHumanReadableSummary: getHumanReadableSummary,
    getDrawOpts: getDrawOpts,
    setConfig: setConfig,
    resetConfig: resetConfig
};
