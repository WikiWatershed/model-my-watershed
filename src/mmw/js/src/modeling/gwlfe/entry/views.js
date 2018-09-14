"use strict";

var _ = require('lodash'),
    Marionette = require('../../../../shim/backbone.marionette'),
    modalViews = require('../../../core/modals/views'),
    round = require('../../../core/utils').round,
    models = require('./models'),
    calcs = require('./calcs'),
    fieldTmpl = require('./templates/field.html'),
    modalTmpl = require('./templates/modal.html'),
    landCoverModalTmpl = require('./templates/landCoverModal.html'),
    landCoverTotalTmpl = require('./templates/landCoverTotal.html'),
    sectionTmpl = require('./templates/section.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html');

var LandCoverModal = modalViews.ModalBaseView.extend({
    template: landCoverModalTmpl,

    id: 'land-cover-modal',
    className: 'modal modal-large fade',

    ui: {
        saveButton: '.btn-active',
    },

    events: _.defaults({
        'click @ui.saveButton': 'saveAndClose',
    }, modalViews.ModalBaseView.prototype.events),

    regions: {
        fieldsRegion: '.rows',
        totalRegion: '.total-content',
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification']);

        var onFieldUpdated = _.bind(this.onFieldUpdated, this),
            fields = this.model.get('fields');

        this.listenTo(fields, 'change', onFieldUpdated);
    },

    // Override to populate fields
    onRender: function() {
        this.fieldsRegion.show(new FieldsView({
            collection: this.model.get('fields'),
        }));
        this.totalRegion.show(new LandCoverTotalView({
            model: this.model,
        }));

        this.$el.modal('show');
    },

    onFieldUpdated: function() {
        var areas = _.cloneDeep(this.model.get('dataModel')['Area']),
            fields = this.model.get('fields'),
            hasUserValue = function(field) {
                return field.get('userValue') !== null;
            };

        fields.filter(hasUserValue).forEach(function(field) {
            var index = parseInt(field.get('name').split('__')[1]);

            areas[index] = parseFloat(field.get('userValue'));
        });

        this.model.set('userTotal', _.sum(areas));

        this.validateModal();
    },

    validateModal: function() {
        var autoTotal = round(this.model.get('autoTotal'), 3),
            userTotal = round(this.model.get('userTotal'), 3);

        this.ui.saveButton.prop('disabled', autoTotal !== userTotal);
    },

    saveAndClose: function() {
        this.addModification(this.model.getOutput());

        this.hide();
    }
});

var LandCoverTotalView = Marionette.ItemView.extend({
    template: landCoverTotalTmpl,
    templateHelpers: function() {
        var fields = this.model.get('fields'),
            hasUserValue = function(field) {
                return field.get('userValue') !== null;
            },
            autoTotal = round(this.model.get('autoTotal'), 3),
            userTotal = round(this.model.get('userTotal'), 3);

        return {
            is_modified: fields.some(hasUserValue),
            autoTotal: autoTotal,
            userTotal: userTotal,
        };
    },

    modelEvents: {
        'change:userTotal': 'render',
    },
});

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
    className: 'row manual-entry',
    template: fieldTmpl,

    ui: {
        input: '.form-control',
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
                                name: 'GrazingAnimal__0',
                                label: 'Are Dairy Cows allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__1',
                                label: 'Cows, Beef',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__1',
                                label: 'Are Beef Cows allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
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
                                name: 'GrazingAnimal__4',
                                label: 'Are Pigs / Hogs / Swine allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__5',
                                label: 'Sheep',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__5',
                                label: 'Are Sheep allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__6',
                                label: 'Horses',
                                calculator: calcs.ArrayIndex,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__6',
                                label: 'Are Horses allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
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
            {
                name: 'other',
                displayName: 'Other Model Data',
                sections: new models.EntrySectionCollection([
                    {
                        title: 'Other Model Data',
                        fields: models.makeFieldCollection('other', dataModel, modifications, [
                            {
                                name: 'SedAAdjust',
                                label: 'Streambank Erosion Adjustment Factor (0-2)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 2,
                            },
                            {
                                name: 'SedDelivRatio',
                                label: 'Sediment Delivery Ratio (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'TileDrainDensity',
                                label: 'Fraction of Cropland Tile Drained (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'TileNconc',
                                label: 'Avg. Tile Drain N Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'TilePConc',
                                label: 'Avg. Tile Drain P Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'TileSedConc',
                                label: 'Avg. Tile Drain Sediment Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'GrNitrConc',
                                label: 'Groundwater N Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'GrPhosConc',
                                label: 'Groundwater P Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'ShedAreaDrainLake',
                                label: 'Wetland / Water Filtration Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'RetentNLake',
                                label: 'N Wetland / Water Retention Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'RetentPLake',
                                label: 'P Wetland / Water Retention Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'RetentSedLake',
                                label: 'TSS Wetland / Water Retention Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                ]),
            },
        ]),
        windowModel = new models.EntryWindowModel({
            dataModel: dataModel,
            title: title,
            tabs: tabs,
        });

    new EntryModal({
        model: windowModel,
        addModification: addModification,
    }).render();
}

function showLandCoverModal(dataModel, modifications, addModification) {
    var fields = models.makeFieldCollection('landcover', dataModel, modifications, [
            {
                name: 'Area__0',
                label: 'Hay / Pasture (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__1',
                label: 'Cropland (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__2',
                label: 'Wooded Areas (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__3',
                label: 'Wetlands (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__6',
                label: 'Open Land (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__7',
                label: 'Barren Areas (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__10',
                label: 'Low-Density Mixed (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__11',
                label: 'Medium-Density Mixed (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__12',
                label: 'High-Density Mixed (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
            {
                name: 'Area__13',
                label: 'Low-Density Open Space (ha)',
                calculator: calcs.ArrayIndex,
                minValue: 0
            },
        ]),
        windowModel = new models.LandCoverWindowModel({
            dataModel: dataModel,
            title: 'Land Cover',
            fields: fields,
        });

    new LandCoverModal({
        model: windowModel,
        addModification: addModification,
    }).render();
}

module.exports = {
    EntryModal: EntryModal,
    showLandCoverModal: showLandCoverModal,
    showSettingsModal: showSettingsModal,
};
