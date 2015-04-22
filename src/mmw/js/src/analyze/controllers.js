"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
    router = require('../router'),
    views = require('./views'),
    models = require('./models');

var AnalyzeController = {
    analyze: function() {
        if (!App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }

        App.map.set('halfSize', true);

        var rootView = App.rootView,
            analyzeWindow = new views.AnalyzeWindow({
                id: 'analyze-output-wrapper',
                collection: new models.LayerCollection({})
            });

        rootView.footerRegion.show(analyzeWindow);
        rootView.geocodeSearchRegion.empty();
        rootView.drawToolsRegion.empty();
    }
};

module.exports = {
    AnalyzeController: AnalyzeController
};
