"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    App = require('../../../app'),
    coreViews = require('../../../core/views'),
    coreModels = require('../../../core/models'),
    resultTmpl = require('./templates/result.html');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',
    template: resultTmpl,

    regions: {
        resultRegion: '.result-region',
    },

    ui: {
        'close': '[data-action="close-subbasin-view"]',
    },

    events: {
        'click @ui.close': 'handleSubbasinCloseButtonClick',
    },

    onShow: function() {
        var taskMessageViewModel = new coreModels.TaskMessageViewModel(),
            polling = true;

        taskMessageViewModel.setWorking(polling ?
            'Calculating Results': 'Gathering Data');

        this.resultRegion.show(
            new coreViews.TaskMessageView({
                model: taskMessageViewModel,
            })
        );

        var isSubbasinMode = true;

        App
            .currentProject
            .fetchResultsIfNeeded(isSubbasinMode);
    },

    handleSubbasinCloseButtonClick: function() {
        this.options.hideSubbasinHotSpotView();
    },
});

module.exports = {
    ResultView: ResultView,
};
