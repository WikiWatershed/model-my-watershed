"use strict";

var App = require('../app'),
    geocoder = require('../geocode/views'),
    views = require('./views'),
    coreModels = require('../core/models'),
    coreUtils = require('../core/utils'),
    coreViews = require('../core/views'),
    modelingModels = require('../modeling/models'),
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

        enableSingleProjectMode();

        if (App.map.get('areaOfInterest')) {
            var aoiView = new coreViews.AreaOfInterestView({
                    id: 'aoi-header-wrapper',
                    App: App,
                    model: new coreModels.AreaOfInterestModel({
                        can_go_back: false,
                        next_label: 'Analyze',
                        url: 'analyze',
                        shape: App.map.get('areaOfInterest')
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

/**
 * If itsi flag is set, prepare a project immedialty upon visiting the page.
 * This will be the only project the user can save during this session.
 */
function enableSingleProjectMode() {
    if (coreUtils.getParameterByName('initialize_itsi') === 'true') {

        App.singleProjectMode = true;

        if (!App.currProject) {
            var project = new modelingModels.ProjectModel({
                name: 'New Activity',
                created_at: Date.now(),
                area_of_interest: null,
                scenarios: new modelingModels.ScenariosCollection()
            });
            project.save();
            App.currProject = project;
        }
    }
}

module.exports = {
    DrawController: DrawController
};
