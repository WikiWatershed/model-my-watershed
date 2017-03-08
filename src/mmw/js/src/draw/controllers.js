"use strict";

var App = require('../app'),
    geocoder = require('../geocode/views'),
    views = require('./views'),
    settings = require('../core/settings'),
    modelingModels = require('../modeling/models'),
    models = require('./models'),
    _ = require('underscore'),
    utils = require('../core/utils'),
    models = require('./models');

var DrawController = {
    drawPrepare: function() {
        App.map.revertMaskLayer();
        if (!App.map.get('areaOfInterest')) {
            App.map.setDrawSize(true);
        }
    },

    draw: function() {
        var geocodeSearch = new geocoder.GeocoderView(),
            toolbarModel = new models.ToolbarModel(),
            toolbarView = new views.ToolbarView({
                model: toolbarModel
            });

        toolbarModel.set('predefinedShapeTypes',
            _.filter(settings.get('boundary_layers'), { selectable: true }));

        App.rootView.geocodeSearchRegion.show(geocodeSearch);
        App.rootView.drawToolsRegion.show(toolbarView);

        enableSingleProjectModeIfActivity();
        App.map.setDrawSize();

        App.state.set('active_page', utils.selectAreaPageTitle);
    },

    drawCleanUp: function() {
        App.rootView.geocodeSearchRegion.empty();
        App.rootView.drawToolsRegion.empty();
        App.rootView.footerRegion.empty();
    }
};

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
