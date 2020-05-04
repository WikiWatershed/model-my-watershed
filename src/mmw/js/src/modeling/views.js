"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    settings = require('../core/settings'),
    coreUnits = require('../core/units'),
    csrf = require('../core/csrf'),
    utils = require('../core/utils'),
    models = require('./models'),
    controls = require('./controls'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    gwlfeConfig = require('./gwlfeModificationConfig'),
    analyzeViews = require('../analyze/views'),
    dataCatalogViews = require('../data_catalog/views'),
    modalModels = require('../core/modals/models'),
    modalViews = require('../core/modals/views'),
    compareViews = require('../compare/views'),
    resultsWindowTmpl = require('./templates/resultsWindow.html'),
    resultsDetailsTmpl = require('./templates/resultsDetails.html'),
    resultsTabPanelTmpl = require('./templates/resultsTabPanel.html'),
    resultsTabContentTmpl = require('./templates/resultsTabContent.html'),
    subbasinResultsTabContentTmpl = require('./templates/subbasinResultsTabContent.html'),
    router = require('../router').router,
    modelingHeaderTmpl = require('./templates/modelingHeader.html'),
    scenariosBarTmpl = require('./templates/scenariosBar.html'),
    scenariosBarButtonsTmpl = require('./templates/scenariosBarButtons.html'),
    scenarioMenuTmpl = require('./templates/scenarioMenu.html'),
    scenarioMenuItemTmpl = require('./templates/scenarioMenuItem.html'),
    scenarioMenuItemOptionsTmpl = require('./templates/scenarioMenuItemOptions.html'),
    projectMenuTmpl = require('./templates/projectMenu.html'),
    scenarioAddChangesButtonTmpl = require('./templates/scenarioAddChangesButton.html'),
    tr55ScenarioToolbarTmpl = require('./templates/tr55ScenarioToolbar.html'),
    gwlfeScenarioToolbarTmpl = require('./templates/gwlfeScenarioToolbar.html'),
    tr55RunoffViews = require('./tr55/runoff/views.js'),
    tr55QualityViews = require('./tr55/quality/views.js'),
    gwlfeRunoffViews = require('./gwlfe/runoff/views.js'),
    gwlfeQualityViews = require('./gwlfe/quality/views.js'),
    gwlfeSubbasinViews = require('./gwlfe/subbasin/views.js');

// The entire modeling header.
var ModelingHeaderView = Marionette.LayoutView.extend({
    model: models.ProjectModel,
    template: modelingHeaderTmpl,

    ui: {
        scenarioAndToolbarContainer: '.toolbar'
    },

    regions: {
        projectMenuRegion: '#project-menu-region',
        scenariosRegion: '#scenarios-region',
        toolbarRegion: '#toolbar-region'
    },

    modelEvents: {
        'change:sidebar_mode': 'toggleToolbar',
    },

    initialize: function() {
        // If the user changes, we should refresh all the views because they
        // have user contextual controls.
        this.listenTo(App.user, 'change', this.reRender);
        this.listenTo(this.model, 'change:id', this.reRender);
        this.listenTo(App.user, 'change:guest', this.saveAfterLogin);
    },

    toggleToolbar: function() {
        if (this.model.get('sidebar_mode') === utils.MODEL) {
            this.ui.scenarioAndToolbarContainer.removeClass('hidden');
            App.map.setModelSize();
        } else {
            this.ui.scenarioAndToolbarContainer.addClass('hidden');
            App.map.setAnalyzeModelSize();
        }
    },

    reRender: function() {
        var self = this;

        this.projectMenuRegion.empty();
        this.projectMenuRegion.show(new ProjectMenuView({
            model: this.model
        }));

        this.scenariosRegion.empty();
        this.scenariosRegion.show(new ScenariosView({
            collection: this.model.get('scenarios'),
            projectModel: this.model
        }));

        this.toolbarRegion.empty();
        App.currentProject.fetchGisDataIfNeeded().done(function() {
            self.toolbarRegion.show(new ScenarioToolbarView({
                collection: self.model.get('scenarios'),
                model: self.model
            }));
        });
    },

    onShow: function() {
        this.reRender();
    },

    saveAfterLogin: function(user, guest) {
        if (!guest && this.model.isNew()) {
            var user_id = user.get('id');
            this.model.set('user_id', user_id);
            this.model.get('scenarios').each(function(scenario) {
                scenario.set('user_id', user_id);
            });
            this.model.saveProjectAndScenarios();
        }
    }
});

// The drop down containing the project name
// and projects options drop down.
var ProjectMenuView = Marionette.ItemView.extend({
    className: 'project',
    ui: {
        rename: '#rename-project',
        share: '#share-project',
        remove: '#delete-project',
        print: '#print-project',
        save: '#save-project',
        itsiClone: '#itsi-clone',
        newProject: '#new-project',
        changeAoI: '#change-aoi',
        showAnalyze: '#show-analyze',
        showMonitor: '#show-monitor',
        showModel: '#show-model',
        modelDescriptionIcon: '#model-desc-icon'
    },

    events: {
        'click @ui.rename': 'renameProject',
        'click @ui.remove': 'deleteProject',
        'click @ui.share': 'shareProject',
        'click @ui.print': 'printProject',
        'click @ui.save': 'saveProjectOrLoginUser',
        'click @ui.itsiClone': 'getItsiEmbedLink',
        'click @ui.newProject': 'createNewProject',
        'click @ui.changeAoI': 'createNewProject',
        'click @ui.showAnalyze': 'showAnalyze',
        'click @ui.showMonitor': 'showMonitor',
        'click @ui.showModel': 'showModel',
    },

    template: projectMenuTmpl,

    templateHelpers: function() {
        var modelPackages = settings.get('model_packages'),
            modelPackageName = this.model.get('model_package'),
            modelPackage = _.find(modelPackages,
                                  {name: modelPackageName}),
            aoiModel = new coreModels.GeoModel({
                shape: App.map.get('areaOfInterest'),
                place: utils.parseAoIName(App.map.get('areaOfInterestName')),
            });
        return {
            itsi: App.user.get('itsi'),
            itsi_embed: settings.get('itsi_embed'),
            editable: isEditable(this.model),
            is_new: this.model.isNew(),
            modelPackage: modelPackage,
            aoiModel: aoiModel
        };
    },

    modelEvents: {
        'change': 'render'
    },

    onRender: function() {
        this.ui.modelDescriptionIcon.popover({
            placement: 'right',
            trigger: 'focus'
        });
        // Popover toggle is inside a dropdown that will close on any click
        // Stop popover toggle from closing dropdown
        this.ui.modelDescriptionIcon.on('click', function (e) {
            e.stopPropagation();
        });
    },

    renameProject: function() {
        var self = this,
            rename = new modalViews.InputView({
            model: new modalModels.InputModel({
                initial: this.model.get('name'),
                title: 'Rename Project',
                fieldLabel: 'Project Name'
            })
        });

        rename.render();

        rename.on('update', function(val) {
            self.model.updateName(val);
            self.model.saveProjectAndScenarios();
        });
    },

    shareProject: function() {
        var share = new modalViews.MultiShareView({
                model: this.model,
                app: App,
            });

        share.render();
    },

    deleteProject: function() {
        var self = this,
            del = new modalViews.ConfirmView({
                model: new modalModels.ConfirmModel({
                    question: 'Are you sure you want to delete this Project?',
                    confirmLabel: 'Delete',
                    cancelLabel: 'Cancel'
                })
            }),
            navigateAfterDelete = function() {
                App.currentProject = null;
                App.projectNumber = undefined;
                App.map.set({
                    'areaOfInterest': null,
                    'areaOfInterestName': null,
                    'wellKnownAreaOfInterest': null,
                });

                router.navigate('projects/', { trigger: true });
            };

        del.render();

        del.on('confirmation', function() {
            // TODO: our version of backbone returns false if model isNew and an
            // xhr otherwise.  Future versions will return just an xhr always at
            // which point this could get consolidated without a conditional.
            var xhr = self.model.destroy({wait: true});
            if (xhr) {
                xhr.done(navigateAfterDelete)
                    .fail(function() {
                        var alertView = new modalViews.AlertView({
                            model: new modalModels.AlertModel({
                                alertMessage: 'Could not delete this project.',
                                alertType: modalModels.AlertTypes.error
                            })
                        });

                        alertView.render();
                    });
            } else {
                navigateAfterDelete();
            }
        });
    },

    printProject: function() {
        window.print();
    },

    saveProjectOrLoginUser: function() {
        if (App.user.get('guest')) {
            App.getUserOrShowLogin();
        } else {
            this.model.saveProjectAndScenarios();
        }
    },

    getItsiEmbedLink: function() {
        var self = this,
            embedLink = window.location.origin +
                '/project/' + App.currentProject.id + '/clone?itsi_embed=true',
            modal = new modalViews.ShareView({
                model: new modalModels.ShareModel({
                    text: 'Embed Link',
                    url: embedLink,
                    guest: App.user.get('guest'),
                    is_private: self.model.get('is_private')
                }),
                app: App
            });

        modal.render();
    },

    createNewProject: function() {
        App.map.set({
            'areaOfInterest': null,
            'areaOfInterestName': '',
            'wellKnownAreaOfInterest': null,
            'zoom': 4,
        });
        App.getMapView().fitToDefaultBounds();
        App.getMapView().setupGeoLocation(true);
        router.navigate('draw/', { trigger: true });
    },

    showAnalyze: function() {
        this.model.set('sidebar_mode', utils.ANALYZE);
    },

    showMonitor: function() {
        this.model.set('sidebar_mode', utils.MONITOR);
    },

    showModel: function() {
        this.model.set('sidebar_mode', utils.MODEL);
    }
});

var ScenarioButtonsView = Marionette.ItemView.extend({
    template: scenariosBarButtonsTmpl,
    collection: models.ScenariosCollection,
    collectionEvents: {
        'change:active': 'render',
    },

    ui: {
        exportGms: '#export-gms',
        exportGmsForm: '#export-gms-form',
        addScenario: '#add-scenario',
        showCompare: '#show-compare',
    },

    events: {
        'click @ui.exportGms': 'downloadGmsFile',
        'click @ui.addScenario': 'addScenario',
        'click @ui.showCompare': 'showCompare',
    },

    initialize: function(options) {
        this.projectModel = options.projectModel;
    },

    addScenario: function() {
        this.collection.createNewScenario();
    },

    templateHelpers: function() {
        // Check the first scenario in the collection as a proxy for the
        // entire collection.
        var scenario = this.collection.first(),
            activeScenario = this.collection.findWhere({ active: true }),
            gis_data = activeScenario && activeScenario.getModifiedGwlfeGisData(),
            isGwlfe = App.currentProject.get('model_package') === utils.GWLFE && !_.isEmpty(gis_data),
            isOnlyCurrentConditions = this.collection.length === 1,
            compareUrl = this.projectModel.getCompareUrl();

        return {
            isOnlyCurrentConditions: isOnlyCurrentConditions,
            editable: isEditable(scenario),
            activeScenario: activeScenario,
            isGwlfe: isGwlfe,
            csrftoken: csrf.getToken(),
            gis_data: JSON.stringify(gis_data),
            showCompare: !isOnlyCurrentConditions,
            compareUrl: compareUrl
        };
    },

    showCompare: function() {
        compareViews.showCompare();
    },

    downloadGmsFile: function() {
        // Refresh the view to update gis_data with any changes made since
        // last render
        this.render();

        // We can't download a file from an AJAX call. One either has to
        // load the data in an iframe, or submit a form that responds with
        // Content-Disposition: attachment. We prefer submitting a form.
        var activeScenario = this.collection.findWhere({ active: true }),
            filename = App.currentProject.get('name').replace(/\s/g, '_') +
                       '__' + activeScenario.get('name').replace(/\s/g, '_');

        this.ui.exportGmsForm.find('.gms-filename').val(filename);
        this.ui.exportGmsForm.trigger('submit');
    },
});

// The toolbar containing the scenario drop down menu region, and
// the scenario button region (add scenario and go to compare view)
var ScenariosView = Marionette.LayoutView.extend({
    collection: models.ScenariosCollection,
    template: scenariosBarTmpl,
    className: 'inline',

    initialize: function(options) {
        this.options = options;
    },

    regions: {
        dropDownRegion: '#scenarios-drop-down-region',
        buttonRegion: '#scenarios-button-region',
    },

    onShow: function() {
        this.dropDownRegion.show(new ScenarioDropDownMenuView({
            collection: this.collection
        }));
        this.buttonRegion.show(new ScenarioButtonsView({
            collection: this.collection,
            projectModel: this.options.projectModel,
        }));
    },
});

// Additional action options to appear in the scenario dropdown menu item
var ScenarioDropDownMenuOptionsView = Marionette.ItemView.extend({
    model: models.ScenarioModel,
    tagName: 'ul',
    template: scenarioMenuItemOptionsTmpl,
    className: 'dropdown-menu scenario-options-dropdown',
    ui: {
        share: '[data-action="share"]',
        duplicate: '[data-action="duplicate"]',
        selectScenario: '[data-action="select"]',
        destroyConfirm: '[data-action="delete"]',
        rename: '[data-action="rename"]',
        exportGms: '[data-action="export-gms"]',
        exportGmsForm: '#export-gms-form',
    },

    events: {
        'click @ui.share': 'showShareModal',
        'click @ui.duplicate': 'duplicateScenario',
        'click @ui.rename': 'renameScenario',
        'click @ui.destroyConfirm': 'destroyConfirm',
        'click @ui.exportGms': 'downloadGmsFile',
    },

    showShareModal: function() {
        var link = window.location.origin +
                   '/project/' + App.currentProject.id +
                   '/scenario/' + this.model.get('id'),
            share = new modalViews.ShareView({
                model: new modalModels.ShareModel({
                    text: 'Scenario',
                    url: link,
                    guest: App.user.get('guest'),
                    is_private: App.currentProject.get('is_private')
                }),
                app: App,
            });

        share.render();
    },

    duplicateScenario: function() {
        this.model.collection.duplicateScenario(this.model.cid);
    },

    renameScenario: function() {
        var self = this,
            collection = self.model.collection,
            validate = _.bind(collection.validateNewScenarioName, self.model),
            rename = new modalViews.InputView({
                model: new modalModels.InputModel({
                    initial: this.model.get('name'),
                    title: 'Rename Scenario',
                    fieldLabel: 'Scenario Name',
                    validationFunction: validate,
                })
        });

        rename.render();

        rename.on('update', function(newName) {
            collection.updateScenarioName(self.model, newName);
        });
    },

    downloadGmsFile: function() {
        // We can't download a file from an AJAX call. One either has to
        // load the data in an iframe, or submit a form that responds with
        // Content-Disposition: attachment. We prefer submitting a form.
        var filename = App.currentProject.get('name').replace(/\s/g, '_') +
                       '__' + this.model.get('name').replace(/\s/g, '_');

        this.ui.exportGmsForm.find('.gms-filename').val(filename);
        this.ui.exportGmsForm.trigger('submit');
    },

    templateHelpers: function() {
        var gis_data = this.model.getModifiedGwlfeGisData(),
            is_gwlfe = App.currentProject.get('model_package') === utils.GWLFE && !_.isEmpty(gis_data);

        return {
            is_gwlfe: is_gwlfe,
            csrftoken: csrf.getToken(),
            gis_data: JSON.stringify(gis_data),
            editable: isEditable(this.model),
            is_new: this.model.isNew(),
        };
    },

    destroyConfirm: function(e) {
         e.preventDefault();

         var self = this,
             del = new modalViews.ConfirmView({
                 model: new modalModels.ConfirmModel({
                     question: 'Are you sure you want to delete this scenario?',
                     confirmLabel: 'Delete',
                     cancelLabel: 'Cancel'
                 })
             });

         del.render();

         del.on('confirmation', function() {
             var modelIndex = self.model.collection.indexOf(self.model);
             self.model.collection.remove(self.model, modelIndex);
         });
     }
});

// The menu item for a scenario in the scenario drop down menu.
var ScenarioDropDownMenuItemView = Marionette.LayoutView.extend({
    model: models.ScenarioModel,
    tagName: 'li',
    template: scenarioMenuItemTmpl,
    regions: {
        'optionsDropdown': '.options-dropdown-region',
    },
    attributes: {
        role: 'presentation'
    },

    modelEvents: {
        'change:options_menu_is_open': 'toggleOptionsDropdown',
    },

    ui: {
        selectScenario: '[data-action="select"]',
        showOptionsDropdown: '[data-action="show-options-dropdown"]',
        scenarioDropdownActions: '.scenario-dropdown-actions',
    },

    events: {
        'click @ui.selectScenario': 'selectScenario',
        'click @ui.showOptionsDropdown': 'onOptionsDropdownClick',
    },

    onOptionsDropdownClick: function(e) {
        e.preventDefault();
        e.stopPropagation();

        this.model.collection.toggleScenarioOptionsMenu(this.model);
    },

    toggleOptionsDropdown: function() {
        if (this.optionsDropdown.hasView() && !this.model.get('options_menu_is_open')) {
            this.ui.scenarioDropdownActions.removeClass('-open');
            this.optionsDropdown.empty();
        } else if (this.model.get('options_menu_is_open')) {
            this.ui.scenarioDropdownActions.addClass('-open');
            this.optionsDropdown.show(new ScenarioDropDownMenuOptionsView({
                model: this.model,
            }));
        }
    },

    selectScenario: function(e) {
        e.preventDefault();
        this.model.collection.setActiveScenario(this.model);
    },

    templateHelpers: function() {
        var gis_data = this.model.getModifiedGwlfeGisData(),
            is_gwlfe = App.currentProject.get('model_package') === utils.GWLFE &&
                        gis_data !== null &&
                        gis_data !== '{}' &&
                        gis_data !== '';

            return {
                is_gwlfe: is_gwlfe,
                gis_data: JSON.stringify(gis_data),
                csrftoken: csrf.getToken(),
                editable: isEditable(this.model),
                is_new: this.model.isNew(),
            };
        },
});

// The menu next to the scenario tabs that is used to select a
// scenario.
var ScenarioDropDownMenuView = Marionette.CompositeView.extend({
    collection: models.ScenariosCollection,
    template: scenarioMenuTmpl,
    childView: ScenarioDropDownMenuItemView,
    childViewContainer: 'ul',

    ui: {
        toggleDropdown: '[data-toggle="dropdown"]',
    },

    events: {
        'click @ui.toggleDropdown': 'toggleDropdown',
    },

    collectionEvents: {
        'change:active change:name': 'render',
        'remove': 'onChildRemoved',
    },

    onChildRemoved: function(model, _, modelIndex) {
        if (model.get('active')) {
            var newCid = this.collection.at(modelIndex - 1).cid;
            this.collection.setActiveScenarioByCid(newCid);
        }
        model.destroy();
        this.render();
   },

   toggleDropdown: function() {
       this.collection.closeAllOpenOptionMenus();
   },

    templateHelpers: function() {
        var activeScenario = this.collection.findWhere({ active: true });
        return {
            name: activeScenario && activeScenario.get('name'),
            hasNoScenarios: this.collection.length <= 1,
        };
    }
});

// The toolbar that contains the modification and input tools
// for a scenario.
var ScenarioModelToolbarView = Marionette.CompositeView.extend({
    template: tr55ScenarioToolbarTmpl,
    model: models.ScenarioModel,
    collection: models.ModelPackageControlsCollection,
    childViewContainer: '.controls',

    tagName: 'div',
    className: 'tab-pane scenario-toolbar-tab-pane',

    childViewOptions: function(modelPackageControl) {
        var controlModel = this.getInputControlModel(modelPackageControl),
            addModification = _.bind(this.model.addModification, this.model),
            addOrReplaceInput = _.bind(this.model.addOrReplaceInput, this.model);
        return {
            controlModel: controlModel,
            addModification: addModification,
            addOrReplaceInput: addOrReplaceInput
        };
    },

    id: function() {
        return this.model.cid;
    },

    attributes: {
        role: 'tabpanel'
    },

    modelEvents: {
        'change:active': 'render'
    },

    initialize: function() {
        var modificationsColl = this.model.get('modifications');
        this.listenTo(modificationsColl, 'add remove reset', this.render);
    },

    // Only display modification controls if scenario is editable.
    // Input controls should always be shown.
    filter: function(modelPackageControl) {
        return isEditable(this.model) || modelPackageControl.isInputControl();
    },

    onRender: function() {
        this.$el.toggleClass('active', this.model.get('active'));
        this.updateMap();
    },

    updateMap: function() {
        if (this.model.get('active')) {
            App.getMapView().updateModifications(this.model);
        }
    },

    getChildView: function(modelPackageControl) {
        var controlName = modelPackageControl.get('name');

        return controls.getControlView(controlName);
    },

    // For a given ModelPackageControlModel (ex. Precipitation), return
    // the instance of that control model from this scenario inputs.
    getInputControlModel: function(modelPackageControl) {
        return this.model.get('inputs').findWhere({
            name: modelPackageControl.get('name')
        });
    }
});

// The toolbar that contains the modification and input tools
// for a scenario.
var Tr55ToolbarView = ScenarioModelToolbarView.extend({
    template: tr55ScenarioToolbarTmpl,
    model: models.ScenarioModel,

    ui: {
        deleteModification: '[data-delete]'
    },

    events: {
        'click @ui.deleteModification': 'deleteModification'
    },

    templateHelpers: function() {
        var shapes = this.model.get('modifications'),
            groupedShapes = shapes.groupBy('name');

        return {
            compareMode: this.compareMode,
            shapes: shapes,
            groupedShapes: groupedShapes,
            editable: isEditable(this.model)
        };
    },

    deleteModification: function(e) {
        var $el = $(e.currentTarget),
            cid = $el.data('delete'),
            modificationsColl = this.model.get('modifications'),
            modification = modificationsColl.get(cid);

        modificationsColl.remove(modification);
    }
});

// The toolbar that contains the modification and input tools
// for a scenario.
var GwlfeToolbarView = ScenarioModelToolbarView.extend({
    template: gwlfeScenarioToolbarTmpl,

    model: models.ScenarioModel,

    ui: {
        thumb: '#gwlfe-modifications-bar .thumb',
        deleteButton: '.delete-modification',
        closeButton: 'button.close'
    },

    events: {
        'click @ui.thumb': 'onThumbClick',
        'click @ui.deleteButton': 'deleteModification',
        'click @ui.closeButton': 'closePopup'
    },

    modelEvents: _.defaults({
        'change:activeModKey': 'render',
        'change:modifications': 'render'
    }, ScenarioModelToolbarView.prototype.modelEvents),

    initialize: function(options) {
        ScenarioModelToolbarView.prototype.initialize.apply(this, [options]);

        var self = this;
        function closePopupOnOutsideClick(e) {
            var isTargetOutside = $(e.target).parents('#gwlfe-modifications-popup').length === 0;
            if (self.model.get('activeModKey') && isTargetOutside) {
                self.closePopup();
            }
        }

        $(document).on('mouseup', function(e) {
            closePopupOnOutsideClick(e);
        });
    },

    setupTooltips: function() {
        var options = this.model.get('activeModKey') ? 'destroy' : null;
        $('#gwlfe-modifications-bar .thumb').tooltip(options);
        $('#gwlfe-modifications-bar i').tooltip(options);
    },

    onRender: function() {
        ScenarioModelToolbarView.prototype.onRender.apply(this);
        this.setupTooltips();
    },

    onShow: function() {
        this.setupTooltips();
    },

    closePopup: function() {
        this.model.set('activeModKey', null);
    },

    getActiveMod: function() {
        var activeModKey = this.model.get('activeModKey'),
            modifications = this.model.get('modifications');
        return activeModKey && modifications.where({modKey: activeModKey})[0];
    },

    deleteModification: function() {
        var activeMod = this.getActiveMod(),
            modifications = this.model.get('modifications');

        if (activeMod) {
            modifications.remove(activeMod);
            this.closePopup();
        }
    },

    onThumbClick: function(e) {
        var modKey = $(e.currentTarget).data('value'),
            thumbOffset = e.target.getBoundingClientRect();

        this.model.set('activeModKey', modKey);

        $('#gwlfe-modifications-popup').offset({
            top: thumbOffset.top - 50
        });
    },

    templateHelpers: function() {
        var activeMod = this.getActiveMod(),
            isEntry = function(m) { return m.modKey.startsWith('entry_'); },
            modifications = this.model.get('modifications').toJSON(),
            editable = isEditable(this.model),
            scheme = settings.get('unit_scheme'),
            areaUnit = coreUnits[scheme].AREA_L_FROM_HA.name,
            lengthUnit = coreUnits[scheme].LENGTH_XL_FROM_KM.name,
            labelUnits = function(string) {
                return string
                    .replace('AREAUNITNAME', areaUnit)
                    .replace('LENGTHUNITNAME', lengthUnit);
            };

        activeMod = activeMod ? activeMod.toJSON() : null;

        return {
            modifications: _.reject(modifications, isEntry),
            activeMod: activeMod,
            displayNames: _.mapValues(gwlfeConfig.displayNames, labelUnits),
            displayUnits: gwlfeConfig.displayUnits,
            editable: editable
        };
    }
});

// The collection of modification and input toolbars for each
// scenario.
var ScenarioToolbarView = Marionette.CompositeView.extend({
    template: scenarioAddChangesButtonTmpl,
    collection: models.ScenariosCollection,
    childViewContainer: '.tab-content.scenario-toolbar-tab-content',
    className: 'toolbar-container',

    ui: {
        addChangesButton: '#add-changes',
        downloadGmsFile: '#download-cc-gms',
        exportGmsForm: '#export-gms-form',
    },

    events: {
        'click @ui.addChangesButton': 'onAddChangesClick',
        'click @ui.downloadGmsFile': 'onGmsDownloadClick',
    },

    collectionEvents: {
        'change:active': 'render',
    },

    getChildView: function() {
        var isGwlfe = this.modelPackage === utils.GWLFE;

        if (isGwlfe) {
            return GwlfeToolbarView;
        } else {
            return Tr55ToolbarView;
        }
    },

    childViewOptions: function(model) {
        var controls = models.getControlsForModelPackage(
                this.modelPackage,
                {is_current_conditions: model.get('is_current_conditions')}
            );

        return {
            collection: controls
        };
    },

    initialize: function() {
        this.modelPackage = this.model.get('model_package');
        this.currentConditions= this.collection.findWhere({is_current_conditions: true});
    },

    onAddChangesClick: function() {
        this.collection.createNewScenario();
    },

    onGmsDownloadClick: function() {
        // We can't download a file from an AJAX call. One either has to
        // load the data in an iframe, or submit a form that responds with
        // Content-Disposition: attachment. We prefer submitting a form.
        var filename = App.currentProject.get('name').replace(/\s/g, '_') +
                       '__' + this.currentConditions.get('name').replace(/\s/g, '_');

        this.ui.exportGmsForm.find('.gms-filename').val(filename);
        this.ui.exportGmsForm.trigger('submit');
    },

    templateHelpers: function() {
        // We don't need to apply modifications to gis_data here
        // because it's only downloadable from this view if
        // the only scenario is current conditions (ie no modifications)
        var gisData = this.model.get('gis_data'),
            isGwlfe = this.modelPackage === utils.GWLFE && !_.isEmpty(gisData),
            isOnlyCurrentConditions = this.collection.length === 1 &&
                this.collection.first().get('is_current_conditions'),
            editable = isEditable(this.model);

        return {
            isOnlyCurrentConditions: isOnlyCurrentConditions,
            isGwlfe: isGwlfe,
            csrftoken: csrf.getToken(),
            gis_data: JSON.stringify(gisData),
            editable: editable
        };
    },
});

var ResultsView = Marionette.LayoutView.extend({
    model: models.ProjectModel,
    id: 'model-output-wrapper',
    tagName: 'div',
    template: resultsWindowTmpl,

    regions: {
        aoiRegion: '.aoi-region',
        analyzeRegion: '#analyze-tab-contents',
        monitorRegion: '#monitor-tab-contents',
        modelingRegion: '#modeling-tab-contents'
    },

    modelEvents: {
        'change:sidebar_mode': 'toggleAoiRegion',
    },

    initialize: function(options) {
        var scenarios = this.model.get('scenarios');

        this.listenTo(scenarios, 'change:active', this.onShow);

        if (options.lock) {
            this.lock = options.lock;
        }

        this.model.fetchGisDataIfNeeded();
        this.model.fetchResultsIfNeeded();
    },

    onRender: function() {
        if (this.lock) {
            this.lock.resolve();
        }

        this.$el.find('.tab-pane:last').addClass('active');
    },

    onShow: function() {
        var scenarios = this.model.get('scenarios'),
            scenario = scenarios.getActiveScenario(),
            analyzeCollection = App.getAnalyzeCollection(),
            dataCatalog = App.getDataCatalog();

        // Add AoI Region but do not show it by default
        this.aoiRegion.show(new analyzeViews.AoiView({
            model: new coreModels.GeoModel({
                place: App.map.get('areaOfInterestName'),
                shape: App.map.get('areaOfInterest')
            })
        }));

        this.aoiRegion.currentView.$el.addClass('hidden');

        this.analyzeRegion.show(new analyzeViews.AnalyzeWindow({
            collection: analyzeCollection
        }));

        this.monitorRegion.show(new dataCatalogViews.DataCatalogWindow(
            dataCatalog
        ));

        if (scenario) {
            var results = scenario.get('results'),
                hasSubbasin = results.some(function(r) {
                    return r.get('name') === 'subbasin';
                });

            // Close sub-basin of previous detail view if active
            // And make any active subbasin detail inactive
            if (hasSubbasin && this.modelingRegion.hasView()) {
                this.modelingRegion.currentView.hideSubbasinHuc12View();
                this.modelingRegion.currentView.hideSubbasinHotSpotView();
            }

            this.modelingRegion.show(new ResultsDetailsView({
                areaOfInterest: this.model.get('area_of_interest'),
                collection: results,
                scenario: scenario,
            }));
        }
    },

    toggleAoiRegion: function() {
        switch (this.model.get('sidebar_mode')) {
            case utils.ANALYZE:
                this.aoiRegion.currentView.$el.removeClass('hidden');
                this.analyzeRegion.$el.addClass('active');
                this.monitorRegion.$el.removeClass('active');
                this.monitorRegion.currentView.setVisibility(false);
                this.modelingRegion.$el.removeClass('active');
                App.hideMapInfo();
                App.getMapView().updateModifications(null);
                App.getMapView().clearSubbasinHuc12s();
                App.getMapView().clearSubbasinCatchments();
                break;
            case utils.MONITOR:
                if (App.map.get('dataCatalogDetailResult') !== null) {
                    this.aoiRegion.currentView.$el.addClass('hidden');
                } else {
                    this.aoiRegion.currentView.$el.removeClass('hidden');
                }
                this.analyzeRegion.$el.removeClass('active');
                this.monitorRegion.$el.addClass('active');
                this.monitorRegion.currentView.setVisibility(true);
                this.modelingRegion.$el.removeClass('active');
                App.hideMapInfo();
                App.getMapView().updateModifications(null);
                App.getMapView().clearSubbasinHuc12s();
                App.getMapView().clearSubbasinCatchments();
                break;
            case utils.MODEL:
                this.aoiRegion.currentView.$el.addClass('hidden');
                this.analyzeRegion.$el.removeClass('active');
                this.monitorRegion.$el.removeClass('active');
                this.monitorRegion.currentView.setVisibility(false);
                this.modelingRegion.$el.addClass('active');
                App.showMapInfo();
                App.getMapView().updateModifications(
                    this.model.get('scenarios').getActiveScenario()
                );
                var modelingView = this.modelingRegion.currentView,
                    subbasins = App.currentProject.get('subbasins'),
                    activeSubbasin = subbasins.getActive(),
                    isVisible = function(region) {
                        return region.hasView() && region.$el.is(':visible');
                    };
                if (isVisible(modelingView.subbasinRegion) ||
                    isVisible(modelingView.subbasinHuc12Region)) {
                    App.map.set('subbasinHuc12s', App.currentProject.get('subbasins'));
                }
                if (isVisible(modelingView.subbasinHuc12Region) && activeSubbasin) {
                    App.map.set('subbasinCatchments', activeSubbasin.get('catchments'));
                }
                break;
        }
    },

    transitionInCss: {
        height: '0%'
    },

    animateIn: function(fitToBounds) {
        var self = this,
            fit = _.isUndefined(fitToBounds) ? true : fitToBounds;

        this.$el.animate({ width: '400px' }, 200, function() {
            App.map.setModelSize(fit);
            self.trigger('animateIn');
            triggerBarChartRefresh();
        });
    },

    animateOut: function() {
        var self = this;

        this.$el.animate({ width: '0px' }, 200, function() {
            self.trigger('animateOut');
        });
    }
});

// Tab panels and tab contents which contain charts
// and graphs for the modeling results.
var ResultsDetailsView = Marionette.LayoutView.extend({
    collection: models.ResultCollection,
    template: resultsDetailsTmpl,

    initialize: function(options) {
        this.scenario = options.scenario;
        this.showPrimaryModelingResults = this.showPrimaryModelingResults.bind(this);
        this.showSubbasinHotSpotView = this.showSubbasinHotSpotView.bind(this);
        this.hideSubbasinHotSpotView = this.hideSubbasinHotSpotView.bind(this);
        this.showSubbasinHuc12View = this.showSubbasinHuc12View.bind(this);
        this.hideSubbasinHuc12View = this.hideSubbasinHuc12View.bind(this);
    },

    regions: {
        subbasinRegion: '.subbasin-region',
        subbasinHuc12Region: '.subbasin-huc12-region',
        panelsRegion: '.tab-panels-region',
        contentRegion: '.tab-contents-region'
    },

    onShow: function() {
        this.showPrimaryModelingResults();
    },

    showPrimaryModelingResults: function() {
        var collection = this.collection.getFilteredResults();

        this.panelsRegion.show(new ResultsTabPanelsView({
            collection: collection,
        }));

        this.contentRegion.show(new ResultsTabContentsView({
            collection: collection,
            scenario: this.scenario,
            areaOfInterest: this.options.areaOfInterest,
            showSubbasinHotSpotView: this.showSubbasinHotSpotView,
        }));
    },

    showSubbasinHotSpotView: function() {
        var self = this;

        this.panelsRegion.$el.hide();
        this.contentRegion.$el.hide();

        App.map.set('subbasinHuc12s', App.currentProject.get('subbasins'));
        this.scenario.set('is_subbasin_active', true);

        this.collection.getResult('subbasin').on('change:selectedLoad', function() {
            var activeSubbasin = App.currentProject.get('subbasins').getActive();

            self.showCatchmentsOnMap(activeSubbasin, this);
        });

        if (!App.user.get('has_seen_hotspot_info')) {
            App.showMapInfo({ view: new gwlfeSubbasinViews.HotspotInfoView() });
        }

        if (this.subbasinRegion.hasView()) {
            return this.subbasinRegion.$el.show();
        }

        this.subbasinRegion.show(new SubbasinResultsTabContentView({
            model: this.collection.getResult('subbasin'),
            scenario: this.scenario,
            hideSubbasinHotSpotView: this.hideSubbasinHotSpotView,
            showHuc12: this.showSubbasinHuc12View,
        }));
    },

    hideSubbasinHotSpotView: function() {
        this.subbasinRegion.$el.hide();
        this.panelsRegion.$el.show();
        this.contentRegion.$el.show();

        this.collection.getResult('subbasin').off('change:selectedLoad');

        this.scenario.set('is_subbasin_active', false);
        App.hideMapInfo({ empty: true });
        App.getMapView().clearSubbasinHuc12s();
        App.rootView.subbasinSliderRegion.empty();
    },

    showSubbasinHuc12View: function() {
        this.subbasinRegion.$el.hide();
        var activeSubbasin = App.currentProject.get('subbasins').getActive(),
            subbasinResult = this.collection.getResult('subbasin');
        if (activeSubbasin) {
            this.showCatchmentsOnMap(activeSubbasin, subbasinResult);

            this.subbasinHuc12Region.show(new SubbasinHuc12TabContentView({
                model: subbasinResult,
                scenario: this.scenario,
                hideSubbasinHotSpotView: this.hideSubbasinHuc12View,
            }));
        }
    },

    hideSubbasinHuc12View: function() {
        var activeSubbasin = App.currentProject.get('subbasins').getActive();
        if (activeSubbasin) {
            activeSubbasin.set('active', false);
        }
        App.getMapView().clearSubbasinCatchments();
        this.subbasinRegion.$el.show();
        this.subbasinHuc12Region.empty();
        App.rootView.subbasinSliderRegion.empty();
    },

    showCatchmentsOnMap: function(activeSubbasin, subbasinResult) {
        var catchments = subbasinResult.get('result')
                         .HUC12s[activeSubbasin.get('id')].Catchments,
            catchmentComids = Object.keys(catchments);

        return activeSubbasin
            .fetchCatchmentsIfNeeded(catchmentComids)
            .then(function() {
                var activeCatchments = activeSubbasin.get('catchments'),
                    selectedLoad = subbasinResult.get('selectedLoad');

                activeCatchments.forEach(function(c) {
                    c.set(_.defaults(
                        { selectedLoad: selectedLoad },
                        catchments[c.id]));
                });

                App.getMapView().clearSubbasinCatchments();
                App.map.set('subbasinCatchments', activeCatchments);
            });
    }
});

// A model result tab
var ResultsTabPanelView = Marionette.ItemView.extend({
    model: models.ResultModel,
    tagName: 'li',
    template: resultsTabPanelTmpl,
    attributes: {
        role: 'presentation'
    },
    initialize: function() {
        this.listenTo(this.model, 'change:polling', this.render);
    }
});

// Tabs used to cycle through model results
var ResultsTabPanelsView = Marionette.CollectionView.extend({
    collection: models.ResultCollection,
    tagName: 'ul',
    className: 'nav nav-tabs model-nav-tabs',
    attributes: {
        role: 'tablist'
    },
    events: {
        'shown.bs.tab li a ': 'triggerBarChartRefresh'
    },

    childView: ResultsTabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    },

    triggerBarChartRefresh: triggerBarChartRefresh
});

// Creates the appropriate view to visualize a result based
// on project.get('model_package') and resultModel.get('name').
var ResultsTabContentView = Marionette.LayoutView.extend({
    model: models.ResultModel,
    template: resultsTabContentTmpl,

    tagName: 'div',

    className: 'tab-pane',

    attributes: {
        role: 'tabpanel'
    },

    regions: {
        resultRegion: '.result-region'
    },

    modelEvents: {
        'change:polling change:result': 'onShow',
    },

    id: function() {
        return this.model.get('name');
    },

    initialize: function(options) {
        this.scenario = options.scenario;
        this.listenTo(App.currentProject, 'change:subbasin_mapshed_job_error change:mapshed_job_error', this.onShow);
    },

    onShow: function() {
        var self = this,
            modelPackage = App.currentProject.get('model_package'),
            resultName = this.model.get('name'),
            ResultView = getResultView(modelPackage, resultName),
            tmvModel = new coreModels.TaskMessageViewModel({ numSteps: getNumSteps(modelPackage) }),
            polling = this.model.get('polling'),
            result = this.model.get('result'),
            mapshedErrorAttribute = this.model.isSubbasin() ?
                'subbasin_mapshed_job_error' :
                'mapshed_job_error',
            mapshedError = App.currentProject.get(mapshedErrorAttribute),
            error = this.model.get('error') || mapshedError;

        if (result) {
            return this.resultRegion.show(new ResultView({
                model: this.model,
                areaOfInterest: this.options.areaOfInterest,
                scenario: this.scenario,
                showSubbasinHotSpotView: this.options.showSubbasinHotSpotView,
                showHuc12: this.options.showHuc12,
            }));
        }

        // Only show this on the initial polling. On subsequent polling, we
        // keep showing the current results.
        tmvModel.setWorking('Gathering Data', 1, getExpectedWaitTime(modelPackage, resultName, true));

        if (error) {
            if (error.timeout) {
                tmvModel.setTimeoutError();
            } else {
                var message = error === 'NO_LAND_COVER' ?
                    'Selected area of interest doesn\'t include any land cover to run the model' :
                    'Error';
                tmvModel.setError(message);
            }
        }

        if (polling) {
            tmvModel.setWorking('Calculating Results', 2, getExpectedWaitTime(modelPackage, resultName));
        }

        self.resultRegion.show(new coreViews.TaskMessageView({
            model: tmvModel,
        }));
    }
});

var SubbasinResultsTabContentView = Marionette.LayoutView.extend({
    model: models.ResultModel,
    template: subbasinResultsTabContentTmpl,
    tagName: 'div',

    className: 'tab-pane',

    ui: {
        'close': '[data-action="close-subbasin-view"]',
        'spinner': '.subbasin-spinner',
    },

    events: {
        'click @ui.close': 'handleSubbasinCloseButtonClick',
    },

    regions: {
        resultContentRegion: '.result-content-region',
    },

    modelEvents: {
        'change:polling': 'showSpinner',
    },

    showSpinner: function() {
        this.ui.spinner.toggleClass('hidden', !this.model.get('polling'));
    },

    handleSubbasinCloseButtonClick: function() {
        this.options.hideSubbasinHotSpotView();
    },

    onShow: function() {
        this.resultContentRegion.show(new ResultsTabContentView({
            model: this.model,
            scenario: this.options.scenario,
            showHuc12: this.options.showHuc12,
        }));
    },
});

var SubbasinHuc12TabContentView = SubbasinResultsTabContentView.extend({
    templateHelpers: {
        backButtonText: 'Back',
    },
    onShow: function() {
        this.resultContentRegion.show(new gwlfeSubbasinViews.Huc12ResultView({
            model: this.model,
            scenario: this.options.scenario,
        }));
    },
});

// Collection of model result tab contents
var ResultsTabContentsView = Marionette.CollectionView.extend({
    collection: models.ResultCollection,
    tagName: 'div',
    className: 'tab-content model-tab-content',
    childView: ResultsTabContentView,
    childViewOptions: function() {
        return {
            scenario: this.scenario,
            areaOfInterest: this.options.areaOfInterest,
            showSubbasinHotSpotView: this.options.showSubbasinHotSpotView,
        };
    },
    initialize: function(options) {
        this.scenario = options.scenario;
    },
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
        triggerBarChartRefresh();
    }
});

function isEditable(scenario) {
    return App.user.userMatch(scenario.get('user_id'));
}

function triggerBarChartRefresh() {
    $('#model-output-wrapper .bar-chart').trigger('bar-chart:refresh');
}

function getResultView(modelPackage, resultName) {
    switch (modelPackage) {
        case utils.TR55_PACKAGE:
            switch(resultName) {
                case 'runoff':
                    return tr55RunoffViews.ResultView;
                case 'quality':
                    return tr55QualityViews.ResultView;
                default:
                    console.log('Result not supported.');
            }
            break;
        case utils.GWLFE:
            switch(resultName) {
                case 'runoff':
                    return gwlfeRunoffViews.ResultView;
                case 'quality':
                    return gwlfeQualityViews.ResultView;
                case 'subbasin':
                    return gwlfeSubbasinViews.ResultView;
                default:
                    console.log('Result not supported.');
            }
            break;
        default:
            console.log('Model package ' + modelPackage + ' not supported.');
    }
}

function getNumSteps(modelPackage) {
    switch (modelPackage) {
        case utils.TR55_PACKAGE:
            return 1;
        case utils.GWLFE:
            return 2;
        default:
            console.log('Model package ' + modelPackage + ' not supported.');
    }
}

function getExpectedWaitTime(modelPackage, resultName, isGatheringData) {
    switch (modelPackage) {
        case utils.TR55_PACKAGE:
            return null;
        case utils.GWLFE:
            if (resultName !== 'subbasin') {
                if (isGatheringData) {
                    return 'This may take up to 30 seconds';
                }

                return 'This may take a few seconds';
            }
            if (isGatheringData) {
                return 'This may take up to a minute';
            }
            return 'This may take up to 3 minutes';
        default:
            console.log('Model package ' + modelPackage + ' not supported.');
    }
}

module.exports = {
    ResultsView: ResultsView,
    ModelingHeaderView: ModelingHeaderView,
    ScenariosView: ScenariosView,
    ScenarioButtonsView: ScenarioButtonsView,
    ScenarioDropDownMenuView: ScenarioDropDownMenuView,
    ScenarioDropDownMenuItemView: ScenarioDropDownMenuItemView,
    ScenarioDropDownMenuOptionsView: ScenarioDropDownMenuOptionsView,
    ScenarioToolbarView: ScenarioToolbarView,
    Tr55ToolbarView: Tr55ToolbarView,
    ProjectMenuView: ProjectMenuView,
    getResultView: getResultView
};
