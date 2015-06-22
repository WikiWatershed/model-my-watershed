"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('./app');

var AppController = {
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
