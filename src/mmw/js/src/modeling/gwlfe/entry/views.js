"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    modalViews = require('../../../core/modals/views'),
    modalTmpl = require('./templates/modal.html'),
    tabPanelTmpl = require('./templates/tabPanel.html');

var EntryModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'entry-modal',
    className: 'modal modal-large fade',

    regions: {
        panelsRegion: '.tab-panels-region',
    },

    // Override to populate tabs
    onRender: function() {
        this.panelsRegion.show(new TabPanelsView({
            collection: this.model.get('tabs'),
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

module.exports = {
    EntryModal: EntryModal,
};
