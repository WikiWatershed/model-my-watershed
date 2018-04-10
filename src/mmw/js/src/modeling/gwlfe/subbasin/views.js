"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    App = require('../../../app'),
    resultTmpl = require('./templates/result.html');

var ResultView = Marionette.LayoutView.extend({
    template: resultTmpl,

    regions: {
        tabRegion: '.subbasin-tab-region',
    },

    templateHelpers: function() {
        return {
            aoiDetails: App.currentProject.get('area_of_interest_name'),
        };
    },

    onShow: function() {
        this.tabRegion.show(new ResultTabs({}));
    },
});

var ResultTabs = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs model-nav-tabs',
    attributes: {
        role: 'tablist'
    },

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    },
});

module.exports = {
    ResultView: ResultView,
};
