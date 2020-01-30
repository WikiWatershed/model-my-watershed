'use strict';

var L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    fitToAoiControlButtonTmpl = require('./templates/fitToAoiControlButton.html');

module.exports = L.Control.extend({
    options: {
        position: 'bottomright'
    },

    initialize: function(options) {
        this.mapModel = options.model;
        this.fitToAoi = options.fitToAoi;
    },

    onAdd: function() {
        return new FitToAoiControlButton({ model: this.mapModel,
                                           fitToAoi: this.fitToAoi }).render().el;
    }
});

var FitToAoiControlButton = Marionette.ItemView.extend({
    // model: MapModel,
    template: fitToAoiControlButtonTmpl,
    className: 'leaflet-control leaflet-control-fit-to-aoi',

    ui: {
        button: '.leaflet-bar-button'
    },

    events: {
        'click @ui.button': 'fitToAoi'
    },

    modelEvents: {
        'change:size': 'render',
        'change:areaOfInterest': 'render'
    },

    initialize: function(options) {
        this.fitToAoi = options.fitToAoi;
    },

    templateHelpers: function() {
        return {
            hidden: this.model.get('areaOfInterest') === null
        };
    }
});
