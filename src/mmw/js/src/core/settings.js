"use strict";

var _ = require('lodash');

var defaultSettings = {
    title: 'Model My Watershed',
    itsi_embed: false,
    itsi_enabled: true,
    data_catalog_enabled: false,
    base_layers: {},
    stream_layers: {},
    coverage_layers: {},
    boundary_layers: {},
    conus_perimeter: {},
    draw_tools: [],
    map_controls: [],
    vizer_urls: {},
    vizer_ignore: [],
    vizer_names: {},
    model_packages: [],
    max_area: 75000,  // Default. Populated at runtime by MAX_AREA in base.py
    enabled_features: [],
    branch: null,
    gitDescribe: null,
};

var settings = (function() {
    return window.clientSettings ? window.clientSettings : defaultSettings;
})();

function isLayerSelectorEnabled() {
    return _.includes(settings['map_controls'], 'LayerSelector');
}

function featureEnabled(feature) {
    return _.includes(settings['enabled_features'], feature);
}

function set(key, value) {
    settings[key] = value;
    return value;
}

function get(key) {
    try {
        return settings[key];
    } catch (exc) {
        return undefined;
    }
}

module.exports = {
    isLayerSelectorEnabled: isLayerSelectorEnabled,
    featureEnabled: featureEnabled,
    get: get,
    set: set
};
