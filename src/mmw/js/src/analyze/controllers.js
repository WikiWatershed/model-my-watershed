"use strict";

var _ = require('underscore'),
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

        // The mask layer should always be applied to the map when entering
        // analyze mode
        if (!App.map.get('maskLayerApplied')) {
            App.map.set('maskLayerApplied', true);
        }
    },

    analyze: function() {
        var aoi = JSON.stringify(App.map.get('areaOfInterest')),
            analyzeWindow = new views.AnalyzeWindow({
                id: 'analyze-output-wrapper',
                model: createTaskModel(aoi)
            });

        App.rootView.footerRegion.show(analyzeWindow);
    },

    analyzeCleanUp: function() {
        App.rootView.footerRegion.empty();
    }
};

// Pass in the serialized Area of Interest for
// caching purposes (_.memoize returns the same
// results for any object), and deserialize
// the AoI for use on the model.
var createTaskModel = _.memoize(function(aoi) {
    return new models.AnalyzeTaskModel({
        area_of_interest: JSON.parse(aoi)
    });
});

module.exports = {
    AnalyzeController: AnalyzeController
};
