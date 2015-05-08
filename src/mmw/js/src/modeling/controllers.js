"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    App = require('../app'),
    router = require('../router').router,
    views = require('./views'),
    models = require('./models');

var ModelingController = {
    modelPrepare: function() {
        if (!App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }
    },

    model: function() {
        var taskModel = new models.Tr55TaskModel(),
            rootView = App.rootView,
            tr55Window = new views.ModelingWindow({
                id: 'analyze-output-wrapper',
                model: taskModel
            }),
            extraHeader = new views.ExtraHeaderView();

        App.rootView.extraHeaderRegion.show(extraHeader);
        App.rootView.footerRegion.show(tr55Window);
    },

    modelCleanUp: function() {
        App.rootView.extraHeaderRegion.empty();
        App.rootView.footerRegion.empty();
    }
};

module.exports = {
    ModelingController: ModelingController
};
