"use strict";

var App = require('../app'),
    geocoder = require('../geocode/views'),
    views = require('./views'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    models = require('./models');


var DrawController = {
    drawPrepare: function() {
        App.map.revertMaskLayer();
    },

    draw: function() {
        var geocodeSearch = new geocoder.GeocoderView(),
            toolbarModel = new models.ToolbarModel(),
            toolbarView = new views.ToolbarView({
                model: toolbarModel
            });

        App.restApi.getPredefinedShapeTypes().then(function(data) {
            toolbarModel.set('predefinedShapeTypes', data);
        });

        App.rootView.geocodeSearchRegion.show(geocodeSearch);
        App.rootView.drawToolsRegion.show(toolbarView);

        if (App.map.get('areaOfInterest')) {
            var aoiView = new coreViews.AreaOfInterestView({
                    id: 'aoi-header-wrapper',
                    App: App,
                    model: new coreModels.AreaOfInterestModel({
                        can_go_back: false,
                        next_label: 'Analyze',
                        url: 'analyze',
                        shape: App.map.get('areaOfInterest'),
                        place: App.map.get('areaOfInterestName')
                    })
            });

            App.rootView.footerRegion.show(aoiView);
        }

    },

    drawCleanUp: function() {
        App.rootView.geocodeSearchRegion.empty();
        App.rootView.drawToolsRegion.empty();
        App.rootView.footerRegion.empty();
    }
};

module.exports = {
    DrawController: DrawController
};
