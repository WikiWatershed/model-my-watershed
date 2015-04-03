"use strict";

var Marionette = require('../shim/backbone.marionette'),
    regions = require('./regions');

var StaticView = Marionette.ItemView.extend({});

var RootView = Marionette.LayoutView.extend({
    el: 'body',

    regions: {
        mainRegion: '#container',
        mapRegion: regions.MapRegion
    },

    load: function(data) {
        this.mapRegion.load(data);
    }
});

module.exports = {
    RootView: RootView,
    StaticView: StaticView
};
