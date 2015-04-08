"use strict";

var Backbone = require('../shim/backbone'),
    Marionette = require('../shim/backbone.marionette');

var MapModel = Backbone.Model.extend({
    load: function(data) {
        var state = data.map;
        if (state) {
            this.set({
                lat: state.lat,
                lng: state.lng,
                zoom: state.zoom
            });
        }
    }
});

module.exports = {
    MapModel: MapModel
};
