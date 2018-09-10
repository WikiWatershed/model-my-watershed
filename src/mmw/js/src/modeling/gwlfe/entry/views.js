"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    modalViews = require('../../../core/modals/views'),
    modalTmpl = require('./templates/modal.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html');

var EntryModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'entry-modal',
    className: 'modal modal-large fade',

    regions: {
        panelsRegion: '.tab-panels-region',
        contentsRegion: '.tab-contents-region',
    },

    // Override to populate tabs
    onRender: function() {
        var tabs = this.model.get('tabs');

        this.panelsRegion.show(new TabPanelsView({
            collection: tabs,
        }));
        this.contentsRegion.show(new TabContentsView({
            collection: tabs,
        }));

        this.$el.modal('show');
    }
});

var TabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: tabPanelTmpl,
    attributes: {
        role: 'presentation'
    },
});

var TabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: TabPanelView,

    onRender: function() {
        this.$('li:first').addClass('active');
    },
});

var TabContentView = Marionette.LayoutView.extend({
    className: 'tab-pane',
    template: tabContentTmpl,
    attributes: {
        role: 'tabpanel'
    },

    id: function() {
        return 'entry_' + this.model.get('name');
    },
});

var TabContentsView = Marionette.CollectionView.extend({
    className: 'tab-content',

    childView: TabContentView,

    onRender: function() {
        this.$('.tab-pane:first').addClass('active');
    },
});

module.exports = {
    EntryModal: EntryModal,
};
