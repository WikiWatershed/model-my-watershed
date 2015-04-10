"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
    geocoder = require('../geocode/controller'),
    views = require('./views'),
    models = require('./models');

var DrawController = {
    draw: function() {
        var rootView = App.rootView,
            geocodeSearch = geocoder.geocodeSearchboxView,
            toolbarModel = new models.ToolbarModel(),
            toolbarView = new views.ToolbarView({
                model: toolbarModel
            });

        App.restApi.getPredefinedShapes().then(function(data) {
            toolbarModel.set('predefinedShapes', data.shapes);
        });

        rootView.geocodeSearchRegion.show(geocodeSearch);
        rootView.drawToolsRegion.show(toolbarView);

        // TODO: Move?
        //$('#login').modal('show');
    }
};

module.exports = {
    DrawController: DrawController
};
