"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('./app'),
    geocoder = require('./geocode/controller');

var AppController = {
    index: function() {
        var geocodeSearch = geocoder.geocodeSearchboxView;

        // TODO: Move to view
        $('#login').modal('show');
        App.rootView.geocodeSearchRegion.show(geocodeSearch);
    },

    analyze: function() {
        // TODO: Move to view
        var map = App.getMap(),
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
