"use strict";

var App = require('../app'),
    geocoder = require('../geocode/views'),
    views = require('./views'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    settings = require('../core/settings'),
    modelingModels = require('../modeling/models'),
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

        toolbarModel.set('predefinedShapeTypes', settings.get('boundary_layers'));

        App.rootView.geocodeSearchRegion.show(geocodeSearch);
        App.rootView.drawToolsRegion.show(toolbarView);

        enableSingleProjectModeIfActivity();

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
            App.map.setDrawWithBarSize(true);
        }

        App.state.set('current_page_title', 'Choose Area of Interest');
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
