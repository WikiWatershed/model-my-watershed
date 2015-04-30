"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
    geocoder = require('../geocode/views'),
    views = require('./views'),
    models = require('./models');

var DrawController = {
    drawPrepare: function() {
        // TODO: Move?
        //$('#login').modal('show');
    },

    draw: function() {
        var geocodeSearch = new geocoder.GeocoderView(),
            toolbarModel = new models.ToolbarModel(),
            toolbarView = new views.ToolbarView({
                model: toolbarModel
            });

        App.restApi.getPredefinedShapes().then(function(data) {
            toolbarModel.set('predefinedShapes', data.shapes);
        });

        App.rootView.geocodeSearchRegion.show(geocodeSearch);
        App.rootView.drawToolsRegion.show(toolbarView);
    },

    drawCleanUp: function() {
        App.rootView.geocodeSearchRegion.empty();
        App.rootView.drawToolsRegion.empty();
    }
};

module.exports = {
    DrawController: DrawController
};
