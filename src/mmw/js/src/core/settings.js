"use strict";

var defaultSettings = {
    base_layers: {},
    stream_layers: {}
};

function setSettings(key, value) {
    defaultSettings[key] = value;
}

function getSettings() {
    return window.clientSettings ? window.clientSettings : defaultSettings;
}

module.exports = {
    getSettings: getSettings,
    setSettings: setSettings
};
