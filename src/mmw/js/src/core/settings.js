"use strict";

var defaultSettings = {
    itsi_embed: false,
    base_layers: {},
    stream_layers: {},
    boundary_layers: {},
    draw_tools: [],
    map_controls: [],
    vizer_urls: {}
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
