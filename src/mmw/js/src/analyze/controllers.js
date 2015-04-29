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

        var taskModel = new models.AnalyzeTaskModel(),
            rootView = App.rootView,
            analyzeWindow = new views.AnalyzeWindow({
                id: 'analyze-output-wrapper',
                model: taskModel
            });

        rootView.footerRegion.show(analyzeWindow);
        rootView.geocodeSearchRegion.empty();
        rootView.drawToolsRegion.empty();
    }
};

module.exports = {
    AnalyzeController: AnalyzeController
};
