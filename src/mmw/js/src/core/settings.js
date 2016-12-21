"use strict";

var defaultSettings = {
    itsi_embed: false,
    base_layers: {},
    stream_layers: {},
    stream_drb_layers: {},
    boundary_layers: {},
    draw_tools: [],
    map_controls: [],
    vizer_urls: {},
    vizer_ignore: [],
    vizer_names: {},
    model_packages: []
};

var settings = (function() {
    return window.clientSettings ? window.clientSettings : defaultSettings;
})();

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
    get: get,
    set: set
};
