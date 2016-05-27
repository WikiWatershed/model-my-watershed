"use strict";

var _ = require('underscore'),
    App = require('../app'),
    router = require('../router').router,
    views = require('./views'),
    models = require('./models'),
    settings = require('../core/settings');

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

        if (settings.get('activityMode')) {
            // Only one project allowed in Activity Mode. Save current project
            // and if in embedded mode, update interactive state for container.
            var project = App.currentProject,
                map = App.map;

            if (project && project.get('scenarios').isEmpty()) {
                project.set({
                    'area_of_interest': map.get('areaOfInterest'),
                    'area_of_interest_name': map.get('areaOfInterestName')
                });
                project
                    .save()
                    .done(function() {
                        if (settings.get('itsi_embed')) {
                            App.itsi.setLearnerUrl('project/' + project.id + '/draw');
                        }
                    });
            }
        } else {
            // Multiple projects allowed in Regular Mode. Nullify current
            // project since a new one will be created and saved by the
            // Modelling Controller.
            App.currentProject = null;
        }
    },

    analyze: function() {
        var aoi = JSON.stringify(App.map.get('areaOfInterest')),
            analyzeModel = App.analyzeModel || createTaskModel(aoi),
            analyzeResults = new views.ResultsView({
                model: analyzeModel
            });

        if (!App.analyzeModel) {
            App.analyzeModel = analyzeModel;
        }

        App.state.set('current_page_title', 'Geospatial Analysis');

        App.rootView.sidebarRegion.show(analyzeResults);
    },

    analyzeCleanUp: function() {
        App.rootView.sidebarRegion.empty();
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
