"use strict";

var App = require('../app'),
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

        if (settings.get('itsi_embed')) {
            // Only one project allowed in embed mode
            var project = App.currentProject,
                map = App.map;

            if (project && project.get('scenarios').isEmpty()) {
                project.set({
                    'area_of_interest': map.get('areaOfInterest'),
                    'area_of_interest_name': map.get('areaOfInterestName')
                });
            }
        } else {
            // Multiple projects allowed in Regular Mode. Nullify current
            // project since a new one will be created and saved by the
            // Modelling Controller.
            App.currentProject = null;
        }
        App.getMapView().addSidebarToggleControl();
    },

    analyze: function() {
        var analyzeCollection = App.getAnalyzeCollection(),
            viewModels = models.createAnalyzeResultViewModelCollection(analyzeCollection),
            analyzeResults = new views.ResultsView({
                collection: viewModels
            });

        App.state.set('current_page_title', 'Geospatial Analysis');

        App.rootView.sidebarRegion.show(analyzeResults);
    },

    analyzeCleanUp: function() {
        App.rootView.sidebarRegion.empty();
        App.getMapView().removeSidebarToggleControl();
    }
};

module.exports = {
    AnalyzeController: AnalyzeController
};
