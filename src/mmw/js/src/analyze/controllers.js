"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
    router = require('../router').router,
    views = require('./views'),
    models = require('./models');

var AnalyzeController = {
    analyzePrepare: function() {
        if (!App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }
    },

    analyze: function() {
        var taskModel = new models.AnalyzeTaskModel(),
            rootView = App.rootView,
            analyzeWindow = new views.AnalyzeWindow({
                id: 'analyze-output-wrapper',
                model: taskModel
            });

        App.rootView.footerRegion.show(analyzeWindow);
    },

    analyzeCleanUp: function() {
        App.rootView.footerRegion.empty();
    }
};

module.exports = {
    AnalyzeController: AnalyzeController
};
