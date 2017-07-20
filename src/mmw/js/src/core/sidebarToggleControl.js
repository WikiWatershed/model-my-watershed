'use strict';

var L = require('leaflet'),
    $ = require('jquery'),
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

    templateHelpers: function() {
        return {
            hidden: this.$sidebar.hasClass('hidden')
        };
    },

    initialize: function() {
        this.$sidebar = $('#sidebar');
    },

    toggle: function() {
        this.$sidebar.toggleClass('hidden');
        this.model.toggleSidebar();

        this.render();
    }
});
