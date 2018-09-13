"use strict";

var _ = require('lodash'),
    Marionette = require('../../../../shim/backbone.marionette'),
    modalViews = require('../../../core/modals/views'),
    models = require('./models'),
    calcs = require('./calcs'),
    fieldTmpl = require('./templates/field.html'),
    modalTmpl = require('./templates/modal.html'),
    sectionTmpl = require('./templates/section.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html');

var EntryModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'entry-modal',
    className: 'modal modal-large fade',

    ui: {
        saveButton: '.btn-active',
    },

    events: _.defaults({
        'click @ui.saveButton': 'saveAndClose',
    }, modalViews.ModalBaseView.prototype.events),

    regions: {
        panelsRegion: '.tab-panels-region',
        contentsRegion: '.tab-contents-region',
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification']);
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
    },

    saveAndClose: function() {
        var addModification = this.addModification;

        this.model.get('tabs').forEach(function(tab) {
            addModification(tab.getOutput());
        });

        this.hide();
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

function showSettingsModal(title, dataModel, modifications, addModification) {
    var tabs = new models.EntryTabCollection([
            // { name: 'efficiencies', displayName: 'Efficiencies' },
            {
                name: 'waste_water',
                displayName: 'Waste Water',
                sections: new models.EntrySectionCollection([
                    {
                        title: 'Wastewater Treatment Plants',
                        fields: models.makeFieldCollection('waste_water', dataModel, modifications, [
                            {
                                name: 'PointNitr',
                                label: 'Annual TN Load (kg/yr)',
                                calculator: calcs.EqualMonths,
                                minValue: 0
                            },
                            {
                                name: 'PointPhos',
                                label: 'Annual TP Load (kg/yr)',
                                calculator: calcs.EqualMonths,
                                minValue: 0
                            },
                            {
                                name: 'PointFlow',
                                label: 'Daily Effluent Discharge (MGD)',
                                calculator: calcs.PointSourceDischarge,
                                minValue: 0
                            },
                        ]),
                    },
                    {
                        title: 'Number of Persons on Different Septic System Types',
                        fields: models.makeFieldCollection('waste_water', dataModel, modifications, [
                            {
                                name: 'NumNormalSys',
                                label: 'Normally Functioning Systems',
                                calculator: calcs.Array12,
                                minValue: 0
                            },
                            {
                                name: 'NumPondSys',
                                label: 'Surface Failures',
                                calculator: calcs.Array12,
                                minValue: 0
                            },
                            {
                                name: 'NumShortSys',
                                label: 'Subsurface Failures',
                                calculator: calcs.Array12,
                                minValue: 0
                            },
                            {
                                name: 'NumDischargeSys',
                                label: 'Direct Discharges',
                                calculator: calcs.Array12,
                                minValue: 0
                            },
                        ]),
                    },
                ]),
            },
            {
                name: 'animals',
                displayName: 'Animals',
                sections: new models.EntrySectionCollection([
                    {
                        title: 'Animal Populations',
                        fields: models.makeFieldCollection('animals', dataModel, modifications, [
                            {
                                name: 'NumAnimals__0',
                                label: 'Cows, Dairy',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__1',
                                label: 'Cows, Beef',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__2',
                                label: 'Chickens, Broilers',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__3',
                                label: 'Chickens, Layers',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__4',
                                label: 'Pigs / Hogs / Swine',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__5',
                                label: 'Sheep',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__6',
                                label: 'Horses',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__7',
                                label: 'Turkeys',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                        ]),
                    },
                    {
                        title: 'Populations Served by Animal Waste Management Systems',
                        fields: models.makeFieldCollection('animals', dataModel, modifications, [
                            {
                                name: 'AWMSGrPct',
                                label: 'Fraction of Livestock served by AWMS (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1
                            },
                            {
                                name: 'AWMSNgPct',
                                label: 'Fraction of Poultry served by AWMS (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1
                            },
                        ]),
                    }
                ]),
            },
            // { name: 'other', displayName: 'Other Model Data' },
        ]),
        windowModel = new models.WindowModel({
            dataModel: dataModel,
            title: title,
            tabs: tabs,
        });

    new EntryModal({
        model: windowModel,
        addModification: addModification,
    }).render();
}

module.exports = {
    EntryModal: EntryModal,
    showSettingsModal: showSettingsModal,
};
