"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../../../../shim/backbone.marionette'),
    resultTmpl = require('./templates/result.html');

var ResultView = Marionette.LayoutView.extend({
    className: 'tab-pane',
    template: resultTmpl,

    ui: {
        'close': '[data-action="close-subbasin-view"]',
    },

    events: {
        'click @ui.close': 'handleSubbasinCloseButtonClick',
    },

    handleSubbasinCloseButtonClick: function() {
        this.options.hideSubbasinHotSpotView();
    },
});

module.exports = {
    ResultView: ResultView,
};
