"use strict";

var Marionette = require('../shim/backbone.marionette'),
    regions = require('./regions');

var App = new Marionette.Application();

App.addRegions({
    mainRegion: '#container',
    mapRegion: regions.MapRegion
});

module.exports = window.MMW = App;
