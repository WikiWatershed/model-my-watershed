"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('./app');

var AppController = {
    analyze: function() {
        // TODO: Move to view
        var map = App.getLeafletMap(),
            marker = L.marker([40.1, -75.7]),
            popup = L.popup()
              .setLatLng([40.1, -75.7])
              .setContent("River Gauge");

        marker.addTo(map).bindPopup(popup).openPopup();

        $('#analyze-tab a').click(function(e) {
            e.preventDefault();
            $(this).tab('show');
        });
    },

    runModel: function() {
        // TODO: Move to view
        $('#output-tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        $('#scenario-tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        $('.selectpicker').selectpicker({
            tickIcon: '',
        });

        $('[data-toggle="tooltip"]').tooltip();
    },

    compare: function() {
        // TODO: Move to view
        $('#compare-tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        $('#scenario-tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        $('.selectpicker').selectpicker({
            tickIcon: ''
        });

        $('[data-toggle="tooltip"]').tooltip();
    }
};

module.exports = {
    AppController: AppController
};
