"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    router = require('../router').router,
    models = require('./models'),
    csrf = require('../core/csrf'),
    settings = require('../core/settings'),
    coreUnits = require('../core/units'),
    modalModels = require('../core/modals/models'),
    modalViews = require('../core/modals/views'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    chart = require('../core/chart'),
    utils = require('../core/utils'),
    pointSourceLayer = require('../core/pointSourceLayer'),
    catchmentWaterQualityLayer = require('../core/catchmentWaterQualityLayer'),
    dataCatalogViews = require('../data_catalog/views'),
    windowTmpl = require('./templates/window.html'),
    AnalyzeDescriptionTmpl = require('./templates/analyzeDescription.html'),
    analyzeResultsTmpl = require('./templates/analyzeResults.html'),
    analyzeLayerToggleTmpl = require('./templates/analyzeLayerToggle.html'),
    analyzeLayerToggleCollectionTmpl = require('./templates/analyzeLayerToggleCollection.html'),
    aoiHeaderTmpl = require('./templates/aoiHeader.html'),
    tableTmpl = require('./templates/table.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
    animalTableTmpl = require('./templates/animalTable.html'),
    animalTableRowTmpl = require('./templates/animalTableRow.html'),
    climateTableTmpl = require('./templates/climateTable.html'),
    climateTableRowTmpl = require('./templates/climateTableRow.html'),
    streamTableTmpl = require('./templates/streamTable.html'),
    streamTableRowTmpl = require('./templates/streamTableRow.html'),
    taskSelectorTmpl = require('./templates/taskSelector.html'),
    varSelectorTmpl = require('./templates/varSelector.html'),
    paginationConrolTmpl = require('./templates/paginationControl.html'),
    pageableTableTmpl = require('./templates/pageableTable.html'),
    pointSourceTableTmpl = require('./templates/pointSourceTable.html'),
    pointSourceTableRowTmpl = require('./templates/pointSourceTableRow.html'),
    catchmentWaterQualityTableTmpl = require('./templates/catchmentWaterQualityTable.html'),
    catchmentWaterQualityTableRowTmpl = require('./templates/catchmentWaterQualityTableRow.html'),
    terrainTableRowTmpl = require('./templates/terrainTableRow.html'),
    terrainTableTmpl = require('./templates/terrainTable.html'),
    tabPanelTmpl = require('../modeling/templates/resultsTabPanel.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    barChartTmpl = require('../core/templates/barChart.html'),
    worksheetExportTmpl = require('./templates/worksheetExport.html'),
    resultsWindowTmpl = require('./templates/resultsWindow.html');

var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Factor to convert km to miles. Multiply by 1000 to convert km instead of m.
var MI_IN_KM = 1000 / coreUnits.USCUSTOMARY.LENGTH_XL.factor;

var ResultsView = Marionette.LayoutView.extend({
    id: 'model-output-wrapper',
    className: 'analyze',
    tagName: 'div',
    template: resultsWindowTmpl,

    ui: {
        changeArea: '[data-action="change-area"]',
        modelPackageLinks: 'a.analyze-model-package-link',
    },

    events: {
        'shown.bs.tab a[href="#analyze-tab-contents"]': 'onAnalyzeTabShown',
        'shown.bs.tab a[href="#monitor-tab-contents"]': 'onMonitorTabShown',
        'click @ui.changeArea': 'changeArea',
        'click @ui.modelPackageLinks': 'selectModelPackage',
    },

    regions: {
        aoiRegion: '.aoi-region',
        analyzeRegion: '#analyze-tab-contents',
        monitorRegion: '#monitor-tab-contents',
        worksheetRegion: '#worksheet-export-region',
    },

    templateHelpers: function() {
        return {
            'data_catalog_enabled': settings.get('data_catalog_enabled'),
            'model_packages': settings.get('model_packages'),
            'isInConus': this.isInConus,
        };
    },

    initialize: function() {
        this.isInConus = utils.isInConus(App.map.get('areaOfInterest'));
    },

    onShow: function() {
        this.showAoiRegion();
        this.showDetailsRegion();

        if (this.isInConus) {
            this.showWorksheetExportRegion();
        }
    },

    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    },

    showAoiRegion: function() {
        this.aoiRegion.show(new AoiView({
            model: new coreModels.GeoModel({
                place: App.map.get('areaOfInterestName'),
                shape: App.map.get('areaOfInterest')
            })
        }));
    },

    showDetailsRegion: function() {
        this.analyzeRegion.show(new AnalyzeWindow({
            collection: this.collection
        }));

        if (this.isInConus) {
            this.monitorRegion.show(new dataCatalogViews.DataCatalogWindow(
                App.getDataCatalog()
            ));
        }
    },

    showWorksheetExportRegion: function() {
        this.worksheetRegion.show(new WorksheetExportView({
            model: new models.WorksheetModel({
                area_of_interest: App.map.get('areaOfInterest'),
                wkaoi: App.map.get('wellKnownAreaOfInterest'),
            }),
        }));
    },

    changeArea: function() {
        App.map.set({
            'areaOfInterest': null,
            'areaOfInterestName': '',
            'wellKnownAreaOfInterest': null,
        });
        router.navigate('draw/', { trigger: true });
    },

    animateIn: function(fitToBounds) {
        var self = this,
            fit = _.isUndefined(fitToBounds) ? true : fitToBounds;

        this.$el.animate({ width: '400px', opacity: 1 }, 200, function() {
            App.map.setAnalyzeSize(fit);
            self.trigger('animateIn');
        });
    },

    onAnalyzeTabShown: function() {
        // Hide Monitor items from the map
        this.monitorRegion.currentView.setVisibility(false);
        // Always show AoI region
        this.aoiRegion.currentView.$el.removeClass('hidden');
    },

    onMonitorTabShown: function() {
        this.monitorRegion.currentView.setVisibility(true);
        // Cache CUAHSI results
        if (!this.cuahsiResultsHaveBeenCached) {
            var self = this;

            this.monitorRegion.currentView
                .cacheCuahsiResults()
                .done(function() {
                    self.cuahsiResultsHaveBeenCached = true;
                });
        }
        // Hide AoI Region if details open
        if (App.map.get('dataCatalogDetailResult') !== null) {
            this.aoiRegion.currentView.$el.addClass('hidden');
        }
    },

    selectModelPackage: function(e) {
        e.preventDefault();

        var modelPackages = settings.get('model_packages'),
            modelPackageName = $(e.currentTarget).data('id'),
            modelPackage = _.find(modelPackages, {name: modelPackageName}),
            newProjectUrl = '/project/new/' + modelPackageName,
            projectUrl = '/project',
            alertView,
            aoiModel = new coreModels.GeoModel({
                shape: App.map.get('areaOfInterest'),
                place: App.map.get('areaOfInterestName')
            }),
            analysisResults = App.getAnalyzeCollection()
                                 .findWhere({name: 'land'}).get('tasks')
                                 .findWhere({taskName: 'analyze/land/2011_2011'})
                                 .get('result') || {},
            landResults = analysisResults.survey;

        if (modelPackageName === utils.GWLFE &&
            settings.get('mapshed_max_area')) {
            var area = aoiModel.getAreaInMeters(),
                mapshedMaxArea = settings.get('mapshed_max_area');

            if (area > mapshedMaxArea) {
                var mmaValue = coreUnits.get('AREA_XL', mapshedMaxArea);
                alertView = new modalViews.AlertView({
                    model: new modalModels.AlertModel({
                        alertMessage:
                            "The selected Area of Interest is too big for " +
                            "the Watershed Multi-Year Model. The currently " +
                            "maximum supported size is " + mmaValue.value +
                            " " + mmaValue.unit + ".",
                        alertType: modalModels.AlertTypes.warn
                    })
                });
                alertView.render();
                return;
            }
        }

        if (landResults) {
            var landCoverTotal = _.sum(_.map(landResults.categories,
                function(category) {
                    if (category.type === 'Open Water') {
                        return 0;
                    }
                    return category.area;
                }));

            if (landCoverTotal === 0) {
                alertView = new modalViews.AlertView({
                    model: new modalModels.AlertModel({
                        alertMessage:
                            "The selected Area of Interest doesn't " +
                            "include any land cover to run the model.",
                        alertType: modalModels.AlertTypes.warn
                    })
                });

                alertView.render();
                return;
            }
        }

        if (modelPackage.disabled) {
            return;
        }

        if (settings.get('itsi_embed') &&
            App.currentProject &&
            !App.currentProject.get('needs_reset')) {
            var currModelPackageName = App.currentProject.get('model_package');
            if (modelPackageName === currModelPackageName) {
                // Go to existing project
                router.navigate(projectUrl, {trigger: true});
            } else {
                var confirmNewProject = new modalViews.ConfirmView({
                    model: new modalModels.ConfirmModel({
                        question:
                            'If you change the model you will ' +
                            'lose your current work.',
                        confirmLabel: 'Switch Model',
                        cancelLabel: 'Cancel',
                        feedbackRequired: true
                    }),
                });

                confirmNewProject.on('confirmation', function() {
                    router.navigate(newProjectUrl, {trigger: true});
                });
                confirmNewProject.render();
            }
        } else {
            router.navigate(newProjectUrl, {trigger: true});
        }
    },
});

var WorksheetExportView = Marionette.ItemView.extend({
    template: worksheetExportTmpl,
    className: 'model-package',

    ui: {
        'worksheetLink': 'a.analyze-worksheet-link',
        'worksheetForm': '#worksheet-form',
        'downloadButton': 'a.status-complete',
    },

    events: {
        'click @ui.worksheetLink': 'onWorksheetClick',
        'click @ui.downloadButton': 'downloadWorksheet',
    },

    modelEvents: {
        'change:status': 'render',
    },

    templateHelpers: function() {
        return {
            csrftoken: csrf.getToken(),
            payload: JSON.stringify(this.model.get('result')),
            disabled: !!this.model.get('wkaoi'),
            started: this.model.get('status') === 'started',
            complete: this.model.get('status') === 'complete',
            failed: this.model.get('status') === 'failed',
        };
    },

    onRender: function() {
        var helpers = this.templateHelpers();

        if (helpers.disabled || helpers.failed) {
            this.$('[data-toggle="popover"]').popover({
                trigger: 'focus',
            });
        }
    },

    onWorksheetClick: function(e) {
        e.preventDefault();

        this.model.runWorksheetAnalysis();
    },

    downloadWorksheet: function(e) {
        e.preventDefault();

        this.ui.worksheetForm.trigger('submit');
    },
});

var AnalyzeWindow = Marionette.LayoutView.extend({
    template: windowTmpl,

    regions: {
        panelsRegion: '.tab-panels-region',
        contentsRegion: '.tab-contents-region',
    },

    onShow: function() {
        this.panelsRegion.show(new TabPanelsView({
            collection: this.collection
        }));

        this.contentsRegion.show(new TabContentsView({
            collection: this.collection
        }));
    }
});

var TabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: tabPanelTmpl,
    attributes: {
        role: 'presentation'
    },

    ui: {
        'tabPanelButton': 'a[data-toggle="tab"]',
    },

    events: {
        'shown.bs.tab @ui.tabPanelButton': 'onTabShown',
    },

    initialize: function() {
        this.listenTo(this.model, 'change:polling', this.render);
    },

    onTabShown: function() {
        var targetId = this.ui.tabPanelButton.attr('href'),
            chartEl = targetId + ' .bar-chart';

        $(chartEl).trigger('bar-chart:refresh');
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
    className: 'tab-pane',
    id: function() {
        return this.model.get('name');
    },
    template: tabContentTmpl,
    attributes: {
        role: 'tabpanel'
    },
    regions: {
        taskSelectorRegion: '.task-selector-region',
        resultRegion: '.result-region'
    },

    modelEvents: {
        'change:activeTask': 'showTaskOutput',
    },

    initialize: function() {
        var model = this.model,
            listenTo = this.listenTo,
            showTaskOutput = _.bind(this.showTaskOutput, this);

        model.get('tasks').forEach(function(task) {
            listenTo(task, 'change:status change:error', function(taskModel) {
                if (taskModel.get('name') === model.getActiveTask().get('name')) {
                    showTaskOutput();
                }
            });
        });
    },

    onShow: function() {
        this.showAnalyzingMessage();

        this.model.fetchAnalysisIfNeeded()
            .always(_.bind(this.showTaskOutput, this));

        if(this.model.get('tasks').length > 1) {
            this.taskSelectorRegion.show(new TaskSelectorView({
                model: this.model
            }));
        }
    },

    showAnalyzingMessage: function() {
        var tmvModel = new coreModels.TaskMessageViewModel();
        tmvModel.setWorking('Analyzing');
        this.resultRegion.show(new coreViews.TaskMessageView({
            model: tmvModel
        }));
        this.model.set({ polling: true });
    },

    showErrorMessage: function(err) {
        var tmvModel = new coreModels.TaskMessageViewModel();

        if (err && err.timeout) {
            tmvModel.setTimeoutError();
        } else if (err && err.responseJSON) {
            if (err.responseJSON.length === 1) {
                tmvModel.setError('Error: ' + err.responseJSON[0]);
            } else if (err.reponseJSON.length > 1) {
                tmvModel.setError('Errors: ' + err.responseJSON.join(', '));
            }
        } else {
            tmvModel.setError('Error');
        }

        this.resultRegion.show(new coreViews.TaskMessageView({
            model: tmvModel
        }));
        this.model.set({ polling: false });
    },

    showResults: function() {
        var activeTask = this.model.getActiveTask(),
            name = activeTask.get('name'),
            result = activeTask.get('result').survey,
            resultModel = new models.LayerModel(result),
            resultView = new AnalyzeResultViews[name]({
                model: resultModel,
                taskGroup: this.model
            });

        this.resultRegion.show(resultView);
        this.model.set({ polling: false });
    },

    showTaskOutput: function() {
        if (!this.isDestroyed) {
            var activeTask = this.model.getActiveTask(),
                status = activeTask.get('status'),
                error = activeTask.get('error');

            if (status === 'started') {
                this.showAnalyzingMessage();
            } else if (status === 'complete') {
                this.showResults();
            } else if (!!error) {
                this.showErrorMessage(error);
            }
        }
    }
});

var TabContentsView = Marionette.CollectionView.extend({
    className: 'tab-content analyze-tab-content',
    childView: TabContentView,
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

var AoiView = Marionette.ItemView.extend({
    template: aoiHeaderTmpl,

    ui: {
        'shapefileForm': '#shapefile-form',
        'dlShapefile': '#download-shapefile',
        'dlGeojson': '#download-geojson',
    },

    events: {
        'click @ui.dlShapefile': 'downloadShapefile',
        'click @ui.dlGeojson': 'downloadGeojson',
    },

    initialize: function() {
        // Toggle AoiView when showing Monitor details
        this.listenTo(App.map, 'change:dataCatalogDetailResult', function(map, newValue) {
            if (newValue === null) {
                this.$el.removeClass('hidden');
            } else {
                this.$el.addClass('hidden');
            }
        });
    },

    templateHelpers: function() {
        return {
            name: utils.parseAoIName(this.model.get('place')),
            csrftoken: csrf.getToken(),
            shape: JSON.stringify(this.model.get('shape'))
        };
    },

    downloadShapefile: function() {
        this.ui.shapefileForm.trigger('submit');
    },

    downloadGeojson: function() {
        utils.downloadJson(this.model.get('shape'),
                           this.model.get('place') + '.geojson');
    }
});

var AnalyzeLayerToggleView = Marionette.ItemView.extend({
    template: analyzeLayerToggleTmpl,

    ui: {
        'toggleButton': '.analyze-layertoggle',
    },

    events: {
        'click @ui.toggleButton': 'toggleLayer',
    },

    initialize: function(options) {
        this.code = options.code;

        this.setLayer();
        if (this.code === 'pointsource' && !this.model) {
            this.layerGroup = App.getLayerTabCollection().getObservationLayerGroup();
            this.listenTo(this.layerGroup, 'change:layers', function() {
                this.setLayer();
                this.render();
            }, this);
            this.listenTo(this.layerGroup, 'change:error change:polling', this.setMessage, this);
            if (!this.layerGroup.get('polling')) {
                this.layerGroup.fetchLayersIfNeeded(App.getLeafletMap());
            }
        }
    },

    setLayer: function() {
        this.model = App.getLayerTabCollection().findLayerWhere({ code: this.code });
        if (this.model) {
            this.model.on('change:active change:disabled', this.renderIfNotDestroyed, this);
            this.message = null;
        }
    },

    renderIfNotDestroyed: function() {
        if (!this.isDestroyed) {
            this.render();
        }
    },

    setMessage: function() {
        var polling = this.layerGroup.get('polling'),
            error = this.layerGroup.get('error');
        if (polling) {
            this.message = 'Loading related layers...';
        } else if (error) {
            this.message = error;
        }
    },

    toggleLayer: function() {
        var layer = this.model,
            layerTabCollection = App.getLayerTabCollection(),
            layerGroup = layerTabCollection.findLayerGroup(layer.get('layerType'));

        utils.toggleLayer(layer, App.getLeafletMap(), layerGroup);
        layerTabCollection.findWhere({ active: true })
                          .set({ active: false });
        layerTabCollection.findWhere({ name: layerGroup.get('name') })
                          .set({ active: true });
    },

    templateHelpers: function() {
        if (this.message) {
            return {
                message: this.message,
            };
        }
        else if (this.model) {
            return {
                layerDisplay: this.model.get('display'),
                isLayerOn: this.model.get('active'),
                isDisabled: this.model.get('disabled')
            };
        }
    },
});

/**
    A dropdown view for toggling multiple related layers
    (eg the water quality tab has TN, TP, and TSS layers).

    Assumes only one layer of the list can be selected/active at a time. If multiple
    can be selected, the active layername will appear as only the first active in
    the list.
**/
var AnalyzeLayerToggleDropdownView = Marionette.ItemView.extend({
    template: analyzeLayerToggleCollectionTmpl,

    ui: {
        'layers': 'a.layer-option',
    },

    events: {
        'click @ui.layers': 'toggleLayer',
    },

    collectionEvents: {
        'change': 'renderIfNotDestroyed',
    },

    toggleLayer: function(e) {
        e.preventDefault();
        var code = $(e.target).data('id'),
            layer = this.collection.findWhere({ code: code }),
            layerTabCollection = App.getLayerTabCollection(),
            layerGroup = layerTabCollection.findLayerGroup(layer.get('layerType'));

        utils.toggleLayer(layer, App.getLeafletMap(), layerGroup);
        layerTabCollection.findWhere({ active: true })
                          .set({ active: false });
        layerTabCollection.findWhere({ name: layerGroup.get('name') })
                          .set({ active: true });
    },

    renderIfNotDestroyed: function() {
        if (!this.isDestroyed) {
            this.render();
        }
    },

    templateHelpers: function() {
        var activeLayer = this.collection.findWhere({ active: true });
        return {
            layers: this.collection.toJSON(),
            activeLayerDisplay: activeLayer && activeLayer.get('display'),
            allDisabled: this.collection.every(function(layer) {
                return layer.get('disabled');
            }),
        };
    }
});

var AnalyzeDescriptionView = Marionette.LayoutView.extend({
    template: AnalyzeDescriptionTmpl,
    ui: {
        helptextIcon: 'a.help',
    },
    regions: {
        layerToggleRegion: '.layer-region',
    },

    onShow: function() {
        var associatedLayerCodes = this.model.get('associatedLayerCodes');
        if (associatedLayerCodes) {
            if (associatedLayerCodes.length === 1) {
                this.layerToggleRegion.show(new AnalyzeLayerToggleView({
                    code: _.first(associatedLayerCodes)
                }));
            } else {
                this.layerToggleRegion.show(new AnalyzeLayerToggleDropdownView({
                    collection: new Backbone.Collection(
                        _.map(associatedLayerCodes, function(code) {
                            return App.getLayerTabCollection()
                                      .findLayerWhere({ code: code });
                    })),
                }));
            }
        }
        if (this.model.get('helpText')) {
            this.ui.helptextIcon.popover({
                placement: 'right',
                trigger: 'focus'
            });
        }
    }
});

var TableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: tableRowTmpl,
    templateHelpers: function() {
        var area = this.model.get('area'),
            units = this.options.units,
            isLandTable = this.options.isLandTable,
            ara = isLandTable ? this.model.get('active_river_area') : null,
            araNull = _.isNull(ara),
            code = isLandTable ? this.model.get('nlcd') : null;

        return {
            // Convert coverage to percentage for display.
            coveragePct: (this.model.get('coverage') * 100),
            // Scale the area to display units.
            scaledArea: coreUnits.get(units, area).value,
            ara: coreUnits.get(units, ara).value,
            araNull: araNull,
            code: code,
            isLandTable: isLandTable
        };
    }
});

var TableView = Marionette.CompositeView.extend({
    childView: TableRowView,
    childViewOptions: function() {
        return {
            units: this.options.units,
            isLandTable: this.options.modelName.startsWith('land_')
        };
    },
    templateHelpers: function() {
        var scheme = settings.get('unit_scheme'),
            units = this.options.units,
            data = _(this.collection.toJSON()),
            isLandTable = this.options.modelName.startsWith('land_'),
            areaTotal = data.map('area').sum(),
            coverageTotal = data.map('coverage').sum(),
            araData = isLandTable && data.map('active_river_area'),
            araTotal = isLandTable && araData.sum(),
            araNull = isLandTable && araData.every(_.isNull);

        return {
            headerUnits: coreUnits[scheme][units].name,
            isLandTable: isLandTable,
            areaTotal: coreUnits.get(units, areaTotal).value,
            coverageTotal: coverageTotal * 100,
            araTotal: araTotal && coreUnits.get(units, araTotal).value,
            araNull: araNull,
        };
    },
    childViewContainer: 'tbody',
    template: tableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    }
});

var AnimalTableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: animalTableRowTmpl,
    templateHelpers: function() {
        return {
            aeu: this.model.get('aeu'),
        };
    }
});

var AnimalTableView = Marionette.CompositeView.extend({
    childView: AnimalTableRowView,
    childViewOptions: function() {
        return {
            units: this.options.units
        };
    },
    templateHelpers: function() {
        return {
            headerUnits: this.options.units
        };
    },
    childViewContainer: 'tbody',
    template: animalTableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    }
});

var ClimateTableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: climateTableRowTmpl,

    templateHelpers: function() {
        return {
            ppt: coreUnits.get('LENGTH_S', this.model.get('ppt') / 100).value,
            tmean: coreUnits.get('TEMPERATURE', this.model.get('tmean')).value,
        };
    },
});

var ClimateTableView = Marionette.CompositeView.extend({
    childView: ClimateTableRowView,
    childViewContainer: 'tbody',
    template: climateTableTmpl,
    templateHelpers: function() {
        var data = this.collection.toJSON(),
            // Standardize precipitation in cm to m before converting to appropriate unit
            totalPpt = coreUnits.get('LENGTH_S', _(data).map('ppt').sum() / 100),
            avgTmean = coreUnits.get('TEMPERATURE', _(data).map('tmean').sum() / 12);

        return {
            totalPpt: totalPpt.value,
            lengthUnit: totalPpt.unit,
            avgTmean: avgTmean.value,
            tempUnit: avgTmean.unit,
        };
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    }
});

var StreamTableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: streamTableRowTmpl,

    templateHelpers: function() {
        var order = this.model.get('order'),
            isMetric = settings.get('unit_scheme') === coreUnits.UNIT_SCHEME.METRIC,
            length = isMetric ? this.model.get('lengthkm') : this.model.get('lengthkm') * MI_IN_KM,
            displayOrder = (function() {
                switch (order) {
                    case 1:
                        return order.toString() + 'st';
                    case 2:
                        return order.toString() + 'nd';
                    case 3:
                        return order.toString() + 'rd';
                    case 999:
                        return 'Other';
                    default:
                        return order.toString() + 'th';
                }
            })();

        return {
            displayOrder: displayOrder,
            length: length,
            avgslope: this.model.get('avgslope'),
            noData: utils.noData,
        };
    },
});

var StreamTableView = Marionette.CompositeView.extend({
    childView: StreamTableRowView,
    childViewContainer: 'tbody',
    template: streamTableTmpl,

    ui: {
        resultsTable: '[data-toggle="table"]',
    },

    onAttach: function() {
        this.ui.resultsTable.bootstrapTable();

        // In order to select popover toggles rendered in the
        // child view, select them directly and not via this.ui
        this.$('[data-toggle="popover"]').popover({
            trigger: 'focus',
        });
    },

    templateHelpers: function() {
        var data = _(this.collection.toJSON()),
            scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_XL.name,
            isMetric = scheme === coreUnits.UNIT_SCHEME.METRIC,
            totalLength = isMetric ?
                data.map('lengthkm').sum() :
                data.map('lengthkm').sum() * MI_IN_KM,
            avgChannelSlope = data.map('total_weighted_slope').sum() / totalLength,
            // Currently we only calculate agricultral percent for the entire
            // set, not per stream order, so we use the first value for total.
            agPercent = data.first().ag_stream_pct,
            lengthInAg = totalLength * agPercent,
            lengthInNonAg = totalLength - lengthInAg,
            conusOnly = this.options.conusOnly;

        return {
            lengthUnit: lengthUnit,
            totalLength: totalLength,
            avgChannelSlope: avgChannelSlope,
            lengthInAg: lengthInAg,
            lengthInNonAg: lengthInNonAg,
            conusOnly: conusOnly,
        };
    },
});

var TerrainTableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: terrainTableRowTmpl,

    templateHelpers: function() {
        var elevation = coreUnits.get('LENGTH_M', this.model.get('elevation')).value;

        return {
            elevation: elevation,
        };
    },
});

var TerrainTableView = Marionette.CompositeView.extend({
    childView: TerrainTableRowView,
    childViewContainer: 'tbody',
    template: terrainTableTmpl,

    templateHelpers: function() {
        var scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_M.name;

        return {
            lengthUnit: lengthUnit,
        };
    },

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    }
});

var PaginationControlView = Marionette.ItemView.extend({
    template: paginationConrolTmpl,

    events: {
        'click .btn-next-page': 'nextPage',
        'click .btn-prev-page': 'prevPage',
    },

    templateHelpers: function() {
        return {
            hasNextPage: this.collection.hasNextPage(),
            hasPreviousPage: this.collection.hasPreviousPage(),
            currentPage: this.collection.state.currentPage,
            totalPages: this.collection.state.totalPages,
        };
    },

    nextPage: function() {
        if (this.collection.hasNextPage()) {
            this.collection.getNextPage();
        }
    },

    prevPage: function() {
        if (this.collection.hasPreviousPage()) {
            this.collection.getPreviousPage();
        }
    },
});

var PageableTableBaseView = Marionette.LayoutView.extend({
    tableView: null, // a View that renders a bootstrap table. Required

    template: pageableTableTmpl,
    regions: {
        'paginationControlsRegion': '.paging-ctl-row',
        'bootstrapTableRegion': '#bootstrap-table-region',
    },

    collectionEvents: {
        'pageable:state:change': 'onShow',
    },

    renderBootstrapTable: function() {
        var self = this,
            sortOrderClass = this.collection.state.order  === -1 ? 'asc' : 'desc',
            tableHeaderSelector = '[data-toggle="table"]' +
                                  '[data-field="' + this.collection.state.sortKey +'"]';

        // We handle sorting for the collection. The bootstrap table handles
        // sorting per page. Set its sort order to the collections
        $(tableHeaderSelector).data("sortOrder", sortOrderClass);

        $('[data-toggle="table"]').bootstrapTable({
            // `name` will be the column's `data-field`
            onSort: function(name) {
                var prevSortKey = self.collection.state.sortKey,
                    shouldSwitchDirection = prevSortKey === name,
                    sortOrder = shouldSwitchDirection ?
                                self.collection.state.order * -1 : 1,

                    sortAscending = function(row) {
                        var data = row.get(name);
                        if (data === utils.noData) {
                            return -Infinity;
                        }
                        if (typeof data === "string") {
                            return utils.negateString(data);
                        }
                        return -row.get(name);
                    },

                    sortDescending = function(row) {
                        var data = row.get(name);
                        if (data === utils.noData) {
                            return -Infinity;
                        }
                        return row.get(name);
                    };

                self.collection.setSorting(name, sortOrder);
                self.collection.fullCollection.comparator = sortOrder === -1 ?
                                                            sortAscending : sortDescending;
                self.collection.fullCollection.sort();

                self.collection.getFirstPage();
            }
        });

        this.addSortedColumnStyling();
    },

    // Ensure the bootstrap table shows the appropriate "sorting caret" (up or down)
    // based on the collection's sort order.
    addSortedColumnStyling: function() {
        var currentSortKey = this.collection.state.sortKey,
            sortOrderClass = this.collection.state.order === -1 ? 'asc' : 'desc',
            headerSelector = '[data-field="' + currentSortKey +'"]';

        $(headerSelector + ' > div.th-inner').addClass(sortOrderClass);
    },

    onShow: function() {
        this.paginationControlsRegion.show(new PaginationControlView({
            collection: this.collection,
        }));
        this.bootstrapTableRegion.show(new this.tableView({
                collection: this.collection,
                units: this.options.units,
            })
        );
        this.renderBootstrapTable();
    },
});

var PointSourceTableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    className: 'point-source',
    template: pointSourceTableRowTmpl,

    templateHelpers: function() {
        var mgd = coreUnits.get('VOLUMETRICFLOWRATE', this.model.get('mgd')),
            kgn = coreUnits.get('MASSPERTIME', this.model.get('kgn_yr')),
            kgp = coreUnits.get('MASSPERTIME', this.model.get('kgp_yr'));

        return {
            discharge: mgd.value,
            n_load: kgn.value,
            p_load: kgp.value,
            noData: utils.noData
        };
    }
});

var PointSourceTableView = Marionette.CompositeView.extend({
    childView: PointSourceTableRowView,
    childViewOptions: function() {
        return {
            units: this.options.units
        };
    },
    templateHelpers: function() {
        var models = this.collection.fullCollection.models,
            getValue = function(key) { return utils.totalForPointSourceCollection(models, key); },
            totalMGD = coreUnits.get('VOLUMETRICFLOWRATE', getValue('mgd')),
            totalKGN = coreUnits.get('MASSPERTIME', getValue('kgn_yr')),
            totalKGP = coreUnits.get('MASSPERTIME', getValue('kgp_yr'));

        return {
            totalMGD: totalMGD.value,
            totalKGN: totalKGN.value,
            totalKGP: totalKGP.value,
            massPerTimeUnit: totalKGN.unit,
            volumetricFlowRateUnit: totalMGD.unit,
        };
    },
    childViewContainer: 'tbody',
    template: pointSourceTableTmpl,

    ui: {
        'pointSourceTR': 'tr.point-source',
        'pointSourceId': '.point-source-id',
    },

    events: {
        'click @ui.pointSourceId': 'panToPointSourceMarker',
        'mouseout @ui.pointSourceId': 'removePointSourceMarker',
        'mouseover @ui.pointSourceTR': 'addPointSourceMarkerToMap',
        'mouseout @ui.pointSourceTR': 'removePointSourceMarker',
    },

    createPointSourceMarker: function(data) {
        var latLng = L.latLng([data.lat, data.lng]);

        this.marker = L.circleMarker(latLng, {
            fillColor: "#49b8ea",
            weight: 0,
            fillOpacity: 0.75
        }).bindPopup(new pointSourceLayer.PointSourcePopupView({
          model: new Backbone.Model(data)
      }).render().el, { closeButton: false });
    },

    addPointSourceMarkerToMap: function(e) {
        var data = $(e.currentTarget).find('.point-source-id').data(),
            map = App.getLeafletMap();

        this.createPointSourceMarker(data);

        this.marker.addTo(map);
    },

    panToPointSourceMarker: function(e) {
        var map = App.getLeafletMap();

        if (!this.marker) {
          var data = $(e.currentTarget).data();
          this.createPointSourceMarker(data);
        }

        this.marker.addTo(map);
        map.panTo(this.marker.getLatLng());
        this.marker.openPopup();
    },

    removePointSourceMarker: function() {
        var map = App.getLeafletMap();

        if (this.marker) {
            map.removeLayer(this.marker);
        }
    }
});

var PointSourcePageableTableView = PageableTableBaseView.extend({
    tableView: PointSourceTableView,
});

var CatchmentWaterQualityTableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    className: 'catchment-water-quality',
    template: catchmentWaterQualityTableRowTmpl,

    templateHelpers: function() {
        // Standardize input hectare to m² before converting units
        var area = coreUnits.get('AREA_L', 10000 * this.model.get('areaha')),
            tn_tot = coreUnits.get('MASSPERAREA_M', this.model.get('tn_tot_kgy')),
            tp_tot = coreUnits.get('MASSPERAREA_M', this.model.get('tp_tot_kgy')),
            tss_tot = coreUnits.get('MASSPERAREA_L', this.model.get('tss_tot_kg'));

        return {
            area: area.value,
            tn_tot: tn_tot.value,
            tp_tot: tp_tot.value,
            tss_tot: tss_tot.value,
            noData: utils.noData
        };
    }
});

var CatchmentWaterQualityTableView = Marionette.CompositeView.extend({
    childView: CatchmentWaterQualityTableRowView,
    childViewOptions: function() {
        return {
            units: this.options.units
        };
    },
    templateHelpers: function() {
        var scheme = settings.get('unit_scheme'),
            areaUnit = coreUnits[scheme].AREA_L.name,
            massPerAreaMUnit = coreUnits[scheme].MASSPERAREA_M.name,
            massPerAreaLUnit = coreUnits[scheme].MASSPERAREA_L.name;

        return {
            areaUnit: areaUnit,
            massPerAreaMUnit: massPerAreaMUnit,
            massPerAreaLUnit: massPerAreaLUnit,
        };
    },
    childViewContainer: 'tbody',
    template: catchmentWaterQualityTableTmpl,

    ui: {
        'catchmentWaterQualityTR': 'tr.catchment-water-quality',
        'catchmentWaterQualityId': '.catchment-water-quality-id',
    },

    events: {
        'click @ui.catchmentWaterQualityId': 'panToCatchmentPolygon',
        'mouseout @ui.catchmentWaterQualityId': 'removeCatchmentPolygon',
        'mouseover @ui.catchmentWaterQualityTR': 'addCatchmentToMap',
        'mouseout @ui.catchmentWaterQualityTR': 'removeCatchmentPolygon',
    },

    createCatchmentPolygon: function(data) {
        var geom = utils.geomForIdInCatchmentWaterQualityCollection(this.collection.models,
            'nord', data.nord);
        var geoJson = {
            "type": "Feature",
            "geometry": geom,
        };
        this.catchmentPolygon = L.geoJson(geoJson, {
            style: {
                fillColor: '#49b8ea',
                fillOpacity: 0.7,
                color: '#49b8ea',
                weight: 0
            }
        }).bindPopup(new catchmentWaterQualityLayer.CatchmentWaterQualityPopupView({
          model: new Backbone.Model(data)
      }).render().el, { closeButton: false });
    },

    addCatchmentToMap: function(e) {
        var data = $(e.currentTarget).find('.catchment-water-quality-id').data(),
            map = App.getLeafletMap();

        this.createCatchmentPolygon(data);

        this.catchmentPolygon.addTo(map);
    },

    panToCatchmentPolygon: function(e) {
        var map = App.getLeafletMap();
        var data = $(e.currentTarget).data();

        if (!this.catchmentPolygon) {
          this.createCatchmentPolygon(data);
        }
        var geom = utils.geomForIdInCatchmentWaterQualityCollection(this.collection.models,
                    'nord', data.nord);
        this.catchmentPolygon.addTo(map);
        map.panInsideBounds(this.catchmentPolygon.getBounds());
        var popUpLocationGeoJSON = utils.findCenterOfShapeIntersection(geom, App.map.get('areaOfInterest'));
        this.catchmentPolygon.openPopup(L.GeoJSON.coordsToLatLng(popUpLocationGeoJSON.geometry.coordinates));
    },

    removeCatchmentPolygon: function() {
        var map = App.getLeafletMap();

        if (this.catchmentPolygon) {
            map.removeLayer(this.catchmentPolygon);
        }
    }
});

var CatchmentWaterQualityPageableTableView = PageableTableBaseView.extend({
    tableView: CatchmentWaterQualityTableView,
});

var ChartView = Marionette.ItemView.extend({
    template: barChartTmpl,
    id: function() {
        return 'chart-' + this.model.get('name');
    },
    className: 'chart-container',

    onAttach: function() {
        this.addChart();
    },

    getBarClass: function(item) {
        var name = this.model.get('name');
        if (name.startsWith('land_') || name.startsWith('drb_2100_land_')) {
            return 'nlcd-fill-' + item.nlcd;
        } else if (name.startsWith('global_land_io_')) {
            return 'io-lulc-fill-' + item.ioclass;
        } else if (name === 'soil') {
            return 'soil-fill-' + item.code;
        } else if (name === 'protected_lands') {
            return 'protected-lands-fill-' + item.code;
        }

        return null;
    },

    addChart: function() {
        var self = this,
            name = this.model.get('name'),
            chartEl = this.$el.find('.bar-chart').get(0),
            data = _.map(this.collection.toJSON(), function(model) {
                return {
                    x: model.type,
                    y: model.coverage,
                    class: self.getBarClass(model)
                };
            }),

            chartOptions = {
               yAxisLabel: 'Coverage',
               isPercentage: true,
               barClasses: _.map(data, 'class')
           };

        // Custom margins as needed
        if (name.startsWith('global_land_io_')) {
            chartOptions.margin = { left: 160 };
        }

        chart.renderHorizontalBarChart(chartEl, data, chartOptions);
    }
});

var AnalyzeResultView = Marionette.LayoutView.extend({
    template: analyzeResultsTmpl,
    regions: {
        descriptionRegion: '.desc-region',
        varSelectorRegion: '.var-selector-region',
        chartRegion: '.chart-region',
        tableRegion: '.table-region',
        printTableRegion: '.print-table-region'
    },

    ui: {
        downloadCSV: '[data-action="download-csv"]',
        table: '.table-region',
        printTable: '.print-table-region',
    },

    events: {
        'click @ui.downloadCSV': 'downloadCSV'
    },

    initialize: function(options) {
        this.taskGroup = options.taskGroup;
    },

    downloadCSV: function() {
        var data = this.model.get('categories'),
            dataName = this.model.get('name'),
            timestamp = new Date().toISOString(),
            filename = 'analyze_' + this.model.get('name') + '_' + timestamp;

        // Render an unpaginated table for tables that can be paginated.
        if (dataName === 'pointsource' || dataName === 'catchment_water_quality') {
            var largestArea = _.max(_.map(data, 'area')),
                units = utils.magnitudeOfArea(largestArea),
                census,
                TableView;

            if (dataName === 'pointsource') {
                census = new coreModels.PointSourceCensusCollection(data);
                TableView = PointSourcePageableTableView;
            } else if (dataName === 'catchment_water_quality') {
                census = new coreModels.CatchmentWaterQualityCensusCollection(data);
                TableView = CatchmentWaterQualityPageableTableView;
            }

            // Ensure all the data is rendered
            census.setPageSize(census.fullCollection.length);

            this.printTableRegion.show(new TableView({
                units: units,
                collection: census
            }));

            this.ui.printTable.tableExport({ type: 'csv', fileName: filename });
            this.printTableRegion.reset();
        } else {
            this.ui.table.tableExport({ type: 'csv', fileName: filename });
        }
    },

    showAnalyzeResults: function(CategoriesToCensus, AnalyzeTableView,
        AnalyzeChartView, title, source, helpText, associatedLayerCodes, pageSize) {
        var categories = this.model.get('categories'),
            largestArea = _.max(_.map(categories, 'area')),
            units = utils.magnitudeOfArea(largestArea),
            census = new CategoriesToCensus(categories),
            activeTask = this.options.taskGroup.get('activeTask');

        if (pageSize) {
            census.setPageSize(pageSize);
        }

        this.tableRegion.show(new AnalyzeTableView({
            units: units,
            collection: census,
            modelName: this.model.get('name'),
            conusOnly: activeTask && activeTask.get('conusOnly'),
        }));

        if (AnalyzeChartView) {
            this.chartRegion.show(new AnalyzeChartView({
                model: this.model,
                collection: census
            }));
        }

        if (title || associatedLayerCodes || source) {
            this.descriptionRegion.show(new AnalyzeDescriptionView({
                model: new Backbone.Model({
                    title: title,
                    associatedLayerCodes: associatedLayerCodes,
                    source: source,
                    helpText: helpText,
                })
            }));
        }
    }
});

var LandResultView  = AnalyzeResultView.extend({
    onShowNlcd: function(taskName) {
        var year = taskName.substring(10), // land_2019_2011 => 2011
            nlcd = 'NLCD' + taskName.substring(7, 9), // land_2019_2011 => NLCD19
            nlcd_year = taskName.substring(5, 9), // land_2019_2011 => 2019
            title = 'Land Use/Cover ' + year + ' (' + nlcd + ')',
            source = 'National Land Cover Database (NLCD ' + nlcd_year + ')',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['nlcd-' + taskName.substring(5)]; // land_2019_2011 => nlcd-2019_2011
        this.showAnalyzeResults(coreModels.LandUseCensusCollection, TableView,
            ChartView, title, source, helpText, associatedLayerCodes);
    },
    onShowProtectedLands: function() {
        var title = 'Protected Lands Distribution',
            source = 'National Inventory of Protected Areas (2016)',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['protected-lands-30m'];
        this.showAnalyzeResults(coreModels.ProtectedLandsCensusCollection, TableView,
            ChartView, title, source, helpText, associatedLayerCodes);
    },
    onShowGlobalLandUse: function(taskName) {
        var year = taskName.substring(15), // global_land_io_2023 => 2023
            title = 'Global Annual LULC ' + year,
            source = 'Impact Observatory via AWS Open Registry',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['io-lulc-' + year];
        this.showAnalyzeResults(coreModels.GlobalLandUseCensusCollection, TableView,
            ChartView, title, source, helpText, associatedLayerCodes);
    },
    onShowFutureLandCenters: function() {
        var title = 'DRB 2100 land forecast (Centers)',
            source = 'DRB Future Land Cover - Shippensburg U.',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['shippensburg-2100-centers-30m'];
        this.showAnalyzeResults(coreModels.LandUseCensusCollection, TableView,
            ChartView, title, source, helpText, associatedLayerCodes);
    },
    onShowFutureLandCorridors: function() {
        var title = 'DRB 2100 land forecast (Corridors)',
            source = 'DRB Future Land Cover - Shippensburg U.',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['shippensburg-2100-corridors-30m'];
        this.showAnalyzeResults(coreModels.LandUseCensusCollection, TableView,
            ChartView, title, source, helpText, associatedLayerCodes);
    },
    onShow: function() {
        var taskName = this.model.get('name');

        switch(taskName) {
            case 'protected_lands':
                this.onShowProtectedLands();
                break;
            case 'drb_2100_land_centers':
                this.onShowFutureLandCenters();
                break;
            case 'drb_2100_land_corridors':
                this.onShowFutureLandCorridors();
                break;
            default:
                if (taskName.startsWith('global')) {
                    this.onShowGlobalLandUse(taskName);
                } else {
                    // e.g. taskName === land_2019_2011
                    this.onShowNlcd(taskName);
                }
        }
    }
});

var SoilResultView  = AnalyzeResultView.extend({
    onShow: function() {
        var title = 'Hydrologic soil group distribution',
            source = 'USDA (gSSURGO 2016)',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['soil'];
        this.showAnalyzeResults(coreModels.SoilCensusCollection, TableView,
            ChartView, title, source, helpText, associatedLayerCodes);
    }
});

var AnimalsResultView = AnalyzeResultView.extend({
    onShow: function() {
        var title = 'Estimated number of farm animals',
            source = 'USDA',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#additional-data-layers\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Additional Data Layers</a>',
            chart = null;
        this.showAnalyzeResults(coreModels.AnimalCensusCollection, AnimalTableView,
            chart, title, source, helpText);
    }
});

var PointSourceResultView = AnalyzeResultView.extend({
    onShow: function() {
        var title = 'Discharge Monitoring Report annual averages',
            source = 'EPA NPDES',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#additional-data-layers\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Additional Data Layers</a>',
            associatedLayerCodes = ['pointsource'],
            avgRowHeight = 30,  // Most rows are between 2-3 lines, 12px per line
            minScreenHeight = 768 + 45, // height of landscape iPad + extra content below the table
            pageSize = utils.calculateVisibleRows(minScreenHeight, avgRowHeight, 6),
            chart = null;
        this.showAnalyzeResults(coreModels.PointSourceCensusCollection,
            PointSourcePageableTableView, chart, title, source, helpText, associatedLayerCodes, pageSize);
    }
});

var CatchmentWaterQualityResultView = AnalyzeResultView.extend({
    onShow: function() {
        var title = 'Delaware River Basin only: Calibrated GWLF-E ' +
                    '(MapShed) model estimates',
            source = 'Stream Reach Assessment Tool (SRAT)',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = [
                'drb_catchment_water_quality_tn',
                'drb_catchment_water_quality_tp',
                'drb_catchment_water_quality_tss',
            ],
            avgRowHeight = 18,  // Most rows are between 1-2 lines, 12px per line
            minScreenHeight = 768 + 45, // height of landscape iPad + extra content below the table
            pageSize = utils.calculateVisibleRows(minScreenHeight, avgRowHeight, 6),
            chart = null;
        this.showAnalyzeResults(coreModels.CatchmentWaterQualityCensusCollection,
            CatchmentWaterQualityPageableTableView, chart, title, source, helpText,
            associatedLayerCodes, pageSize);
    }
});

var TerrainResultView = AnalyzeResultView.extend({
    onShow: function() {
        var title = 'Terrain Statistics',
            source = 'NHDPlus V2 NEDSnapshot DEM',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['elevation', 'pct_slope'],
            chart = null;

        this.showAnalyzeResults(coreModels.TerrainCensusCollection, TerrainTableView,
            chart, title, source, helpText, associatedLayerCodes);
    }
});

var TaskSelectorView = Marionette.ItemView.extend({
    template: taskSelectorTmpl,

    ui: {
        selector: 'select',
    },

    events: {
        'change @ui.selector': 'updateTask',
    },

    templateHelpers: function() {
        return {
            activeTaskName: this.model.getActiveTask().get('name'),
            keys: this.model.get('tasks').map(function(task) {
                return {
                    name: task.get('name'),
                    label: task.get('displayName'),
                    loading: task.get('status') === 'started',
                    failed: task.get('status') === 'failed',
                };
            }),
        };
    },

    initialize: function() {
        var self = this;

        this.model.get('tasks').forEach(function(task) {
            self.listenTo(task, 'change:status', self.render);
        });
    },

    updateTask: function() {
        var taskName = this.ui.selector.val();
        this.model.setActiveTask(taskName);
        this.model.get('activeTask').fetchAnalysisIfNeeded();
    }
});

var VarSelectorView = Marionette.ItemView.extend({
    template: varSelectorTmpl,

    ui: {
        selector: 'select',
    },

    events: {
        'change @ui.selector': 'updateActiveVar',
    },

    modelEvents: {
        'change:activeVar': 'render',
    },

    initialize: function(options) {
        this.keys = options.keys;
    },

    templateHelpers: function() {
        return {
            keys: this.keys,
        };
    },

    updateActiveVar: function() {
        var activeVar = this.ui.selector.val();

        this.model.set({ activeVar: activeVar });
    }
});

var ClimateChartView = ChartView.extend({
    modelEvents: {
        'change:activeVar': 'addChart',
    },

    addChart: function() {
        var chartEl = this.$('.bar-chart').get(0),
            scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name,
            tempUnit = coreUnits[scheme].TEMPERATURE.name,
            activeVar = this.model.get('activeVar'),
            config = activeVar === 'ppt' ?
                {
                    label: 'Water Depth (' + lengthUnit + ')',
                    unit: lengthUnit,
                    key: 'Mean Precipitation'
                } : {
                    label: 'Temperature (' + tempUnit + ')',
                    unit: tempUnit,
                    key: 'Mean Temperature'
                },
            data = [
                {
                    key: config.key,
                    values: this.collection.map(function(model, idx) {
                        return {
                            x: idx,
                            y: activeVar === 'ppt' ?
                                // Standardize precipitation in cm to m before
                                // converting to appropriate unit
                                coreUnits.get('LENGTH_S', model.get(activeVar) / 100).value :
                                coreUnits.get('TEMPERATURE', model.get(activeVar)).value,
                        };
                    }),
                },
            ],
            chartOptions = {
                yAxisLabel: config.label,
                yAxisUnit: config.unit,
                xAxisLabel: function(x) {
                    return monthNames[x];
                },
                xTickValues: _.range(12),
                yTickFormat: '0.01f',
            };

        $(chartEl).empty();

        chart.renderLineChart(chartEl, data, chartOptions);
    }
});

var ClimateResultView = AnalyzeResultView.extend({
    initialize: function(options) {
        AnalyzeResultView.prototype.initialize.call(this, options);
        this.model.set('activeVar', 'ppt');
    },

    onShow: function() {
        var title = 'Mean Monthly Precipitation and Temperature',
            source = 'PRISM Climate Group',
            helpText = 'For more information on the data source, see <a href=\'http://prism.nacse.org\' target=\'_blank\' rel=\'noreferrer noopener\'>PRISM Climate Group website</a>',
            associatedLayerCodes = [
                'mean_ppt',
                'mean_temp',
            ];

        this.showAnalyzeResults(coreModels.ClimateCensusCollection, ClimateTableView,
            ClimateChartView, title, source, helpText, associatedLayerCodes);

        this.varSelectorRegion.show(new VarSelectorView({
            model: this.model,
            keys: [
                { name: 'ppt', label: 'Mean Precipitation' },
                { name: 'tmean', label: 'Mean Temperature' },
            ],
        }));
    }
});

var StreamResultView = AnalyzeResultView.extend({
    onShow: function() {
        var taskName = this.model.get('name'),
            config = {
                streams_nhdhr: {
                    title: 'NHD High Resolution Stream Network Statistics',
                    source: 'NHDplusHR',
                    associatedLayerCodes: ['nhd_streams_hr_v1'],
                },
                streams_nhd: {
                    title: 'NHD Medium Resolution Stream Network Statistics',
                    source: 'NHDplusV2',
                    associatedLayerCodes: ['nhd_streams_v2'],
                },
                streams_tdxstreams: {
                    title: 'TDX Hydro Global Stream Network Statistics',
                    source: 'TDX-Hydro',
                    associatedLayerCodes: ['tdxhydro_streams_v1'],
                },
            },
            helpText = 'For more information on the data source, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-in-layers-streams\' target=\'_blank\' >MMW Technical Documentation</a>',
            chart = null,
            streamOrderHelpText = [
                {
                    order: 999, text: 'Contains canals, artificial paths, coastlines, and other flowlines without a flow direction'
                }
            ],
            streamOrders = this.model.get('categories');

        // Merge helptext in with stream order results
        _.forEach(streamOrderHelpText, function(help) {
            var stream = _.find(streamOrders, { order: help.order });
            if (stream) {
                stream.helpText = help.text;
            }
        });

        this.showAnalyzeResults(coreModels.StreamsCensusCollection, StreamTableView,
                                chart, config[taskName].title,
                                config[taskName].source, helpText,
                                config[taskName].associatedLayerCodes);
    },
});

var AnalyzeResultViews = {
    land_2019_2019: LandResultView,
    land_2019_2016: LandResultView,
    land_2019_2011: LandResultView,
    land_2019_2006: LandResultView,
    land_2019_2001: LandResultView,
    land_2011_2011: LandResultView,
    global_land_io_2023: LandResultView,
    soil: SoilResultView,
    animals: AnimalsResultView,
    pointsource: PointSourceResultView,
    catchment_water_quality: CatchmentWaterQualityResultView,
    climate: ClimateResultView,
    streams_nhd: StreamResultView,
    streams_nhdhr: StreamResultView,
    streams_tdxstreams: StreamResultView,
    terrain: TerrainResultView,
    protected_lands: LandResultView,
    drb_2100_land_centers: LandResultView,
    drb_2100_land_corridors: LandResultView,
};

module.exports = {
    ResultsView: ResultsView,
    AnalyzeWindow: AnalyzeWindow,
    AnalyzeResultViews: AnalyzeResultViews,
    AoiView: AoiView,
};
