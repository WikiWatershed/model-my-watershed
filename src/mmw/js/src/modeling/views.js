"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    windowTmpl = require('./templates/window.ejs'),
    detailsTmpl = require('./templates/details.ejs'),
    tabPanelTmpl = require('./templates/tabPanel.ejs'),
    tabContentTmpl = require('./templates/tabContent.ejs'),
    extraHeaderTmpl = require('./templates/extraHeader.ejs');

var ModelingWindow = Marionette.LayoutView.extend({
    tagName: 'div',
    id: 'modeling-output-wrapper',
    template: windowTmpl,

    regions: {
        detailsRegion: '#modeling-details-region'
    },

    onShow: function() {
        var self = this;

        setTimeout(function() {
            self.showDetailsRegion();
        }, 1000);
    },

    showDetailsRegion: function() {
        this.detailsRegion.show(new DetailsView({
            collection: new models.ResultCollection([
                {name: 'runoff',  displayName: 'Runoff'},
                {name: 'quality', displayName: 'Water Quality'}
            ])}));
    },

    transitionInCss: {
        height: '0%'
    },

    animateIn: function() {
        var self = this;

        this.$el.animate({ height: '55%' }, 400, function() {
            self.trigger('animateIn');
            App.map.set('halfSize', true);
        });
    },

    animateOut: function() {
        var self = this;

        this.$el.animate({ height: '0%' }, 100, function() {
            self.trigger('animateOut');
            App.map.set('halfSize', false);
        });
    }
});

var DetailsView = Marionette.LayoutView.extend({
    template: detailsTmpl,

    regions: {
        panelsRegion: '.tab-panels-region',
        contentRegion: '.tab-contents-region'
    },

    onShow: function() {
        this.panelsRegion.show(new TabPanelsView({
            collection: this.collection
        }));

        this.contentRegion.show(new TabContentsView({
            collection: this.collection
        }));
    }
});

var TabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: tabPanelTmpl,
    attributes: {
        role: 'presentation'
    }
});

var TabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: TabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    }
});

var TabContentView = Marionette.LayoutView.extend({
    tagName: 'div',
    className: 'tab-pane',
    id: function() {
        return this.model.get('name');
    },
    template: tabContentTmpl,
    attributes: {
        role: 'tabpanel'
    }
});

var TabContentsView = Marionette.CollectionView.extend({
    tagName: 'div',
    className: 'tab-content',
    childView: TabContentView,
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }

});

var ExtraHeaderView = Marionette.ItemView.extend({
    template: extraHeaderTmpl
});

module.exports = {
    ModelingWindow: ModelingWindow,
    ExtraHeaderView: ExtraHeaderView
};
