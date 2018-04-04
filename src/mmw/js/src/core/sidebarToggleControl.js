'use strict';

var L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    sidebarToggleControlButtonTmpl = require('./templates/sidebarToggleControlButton.html');

module.exports = L.Control.extend({
    options: {
        position: 'bottomright'
    },

    initialize: function(options) {
        this.mapModel = options.model;
    },

    onAdd: function() {
        return new SidebarToggleControlButton({ model: this.mapModel }).render().el;
    }
});

var SidebarToggleControlButton = Marionette.ItemView.extend({
    // model: MapModel,
    template: sidebarToggleControlButtonTmpl,
    className: 'leaflet-control leaflet-control-sidebar-toggle',

    ui: {
        button: '.leaflet-bar-button'
    },

    events: {
        'click @ui.button': 'toggle'
    },

    modelEvents: {
        'change:size': 'render',
    },

    templateHelpers: function() {
        return {
            hidden: this.model.get('size') && !this.model.get('size').hasSidebar
        };
    },

    toggle: function() {
        this.model.toggleSidebar();
        this.render();
    }
});
