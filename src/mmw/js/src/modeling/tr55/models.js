"use strict";

var Backbone = require('backbone'),
    turfArea = require('turf-area');

var AoiVolumeModel = Backbone.Model.extend({
    defaults: {
        areaOfInterest: null,
        aoiArea: 0
    },

    initialize: function() {
        if (this.canSetArea()) {
            this.setArea();
        }

        this.on('change:areaOfInterest', this.setArea);
    },

    canSetArea: function() {
        return !!(this.get('areaOfInterest') && !this.get('aoiArea'));
    },

    setArea: function() {
        this.set('aoiArea', turfArea(this.get('areaOfInterest')));
    },

    adjust: function(depth) {
        // Adjusted runoff is depth (cm) -> meters * the AoI area (m²)
        return (depth / 100) * this.get('aoiArea');
    },

    getLoadingRate: function(load) {
        // The loadingRate is the load per hectare.
        // The aoiArea is in m², so we divide by 10000 to get hectares.
        return load / (this.get('aoiArea') / 10000);
    }
});

module.exports = {
    AoiVolumeModel: AoiVolumeModel
};
