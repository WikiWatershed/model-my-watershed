'use strict';

var L = require('leaflet'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    sidebarToggleControlButtonTmpl = require('./templates/sidebarToggleControlButton.html');

module.exports = L.Control.extend({
    options: {
        position: 'bottomright'
    },

    onAdd: function() {
        return new SidebarToggleControlButton({}).render().el;
    }
});

var SidebarToggleControlButton = Marionette.ItemView.extend({
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
            hidden: this.$sidebar.hasClass('hidden-sidebar')
        };
    },

    initialize: function() {
        this.$sidebar = $('#sidebar');
        this.$mapContainer = $('body>div.map-container');
    },

    toggle: function() {
        this.$sidebar.toggleClass('hidden-sidebar');
        this.$mapContainer.toggleClass('hidden-sidebar');

        this.render();
    }
});
