"use strict";

var App = require('../app'),
    geocoder = require('../geocode/views'),
    views = require('./views'),
    settings = require('../core/settings'),
    modelingModels = require('../modeling/models'),
    models = require('./models'),
    utils = require('../core/utils'),
    models = require('./models');

var DrawController = {
    drawPrepare: prepareView,

    draw: function() {
        var geocodeSearch = new geocoder.GeocoderView(),
            toolbarModel = new models.ToolbarModel();

        toolbarModel.set('predefinedShapeTypes',
            settings
                .get('boundary_layers')
                .filter(function(layer) {
                    if (settings.get('data_catalog_enabled')) {
                        return (layer.big_cz && layer.selectable);
                    }
                    return layer.selectable;
                }));

        if (!App.rootView.geocodeSearchRegion.hasView()) {
            App.rootView.geocodeSearchRegion.show(geocodeSearch);
        }

        App.rootView.sidebarRegion.show(new views.DrawWindow({
            model: toolbarModel
        }));

        enableSingleProjectModeIfActivity();

        App.map.setDrawSize();
        App.state.set('active_page', utils.selectAreaPageTitle);
    },

    drawCleanUp: function() {
        App.rootView.geocodeSearchRegion.empty();
        App.rootView.footerRegion.empty();
    },

    splashPrepare: prepareView,

    splash: function() {
        App.rootView.geocodeSearchRegion.show(new geocoder.GeocoderView());
        App.rootView.sidebarRegion.show(new views.SplashWindow());
        App.map.setDrawSize();
        App.state.set({
            'active_page': utils.splashPageTitle,
        });
    }
};

function prepareView() {
    App.map.revertMaskLayer();
}

/**
 * If we are in embed mode then the project is an activity and we want to keep
 * the same project reguardless of changes to the AOI. This prepares a project
 * immedialty upon visiting the page and will be the only project the user can
 * save during this session.
 */
function enableSingleProjectModeIfActivity() {
    if (settings.get('activityMode')) {
        if (!App.currentProject) {
            var project = new modelingModels.ProjectModel({
                name: 'New Activity',
                created_at: Date.now(),
                area_of_interest: null,
                scenarios: new modelingModels.ScenariosCollection(),
                is_activity: true,
                needs_reset: true
            });
            App.currentProject = project;
        }
    }
}

module.exports = {
    DrawController: DrawController
};
