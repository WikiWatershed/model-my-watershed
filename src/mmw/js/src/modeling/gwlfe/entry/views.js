"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    modalViews = require('../../../core/modals/views'),
    fieldTmpl = require('./templates/field.html'),
    modalTmpl = require('./templates/modal.html'),
    sectionTmpl = require('./templates/section.html'),
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

    regions: {
        sectionsRegion: '.sections-region',
    },

    onShow: function() {
        this.sectionsRegion.show(new SectionsView({
            collection: this.model.get('sections'),
        }));
    },
});

var TabContentsView = Marionette.CollectionView.extend({
    className: 'tab-content',

    childView: TabContentView,

    onRender: function() {
        this.$('.tab-pane:first').addClass('active');
    },
});

var FieldView = Marionette.ItemView.extend({
    className: 'row',
    template: fieldTmpl,

    ui: {
        input: 'input',
    },

    events: {
        'change @ui.input': 'updateUserValue',
        'click button': 'resetUserValue',
    },

    modelEvents: {
        'change:userValue': 'render',
    },

    onRender: function() {
        this.$('[data-toggle="popover"]').popover();
    },

    updateUserValue: function() {
        var value = this.ui.input.val();

        this.model.set('userValue', value || null);
    },

    resetUserValue: function() {
        this.ui.input.val('');
        this.$('[data-toggle="popover"]').popover('destroy');
        this.model.set('userValue', null);
    }
});

var FieldsView = Marionette.CollectionView.extend({
    childView: FieldView,
});

var SectionView = Marionette.LayoutView.extend({
    template: sectionTmpl,

    regions: {
        fieldsRegion: '.rows',
    },

    onShow: function() {
        this.fieldsRegion.show(new FieldsView({
            collection: this.model.get('fields'),
        }));
    }
});

var SectionsView = Marionette.CollectionView.extend({
    className: 'section',

    childView: SectionView,
});

module.exports = {
    EntryModal: EntryModal,
};
