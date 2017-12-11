"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    lodash = require('lodash'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    router = require('../router').router,
    models = require('./models'),
    settings = require('../core/settings'),
    modalModels = require('../core/modals/models'),
    modalViews = require('../core/modals/views'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    chart = require('../core/chart'),
    utils = require('../core/utils'),
    pointSourceLayer = require('../core/pointSourceLayer'),
    catchmentWaterQualityLayer = require('../core/catchmentWaterQualityLayer'),
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
    selectorTmpl = require('./templates/selector.html'),
    pageableTableTmpl = require('./templates/pageableTable.html'),
    pointSourceTableTmpl = require('./templates/pointSourceTable.html'),
    pointSourceTableRowTmpl = require('./templates/pointSourceTableRow.html'),
    catchmentWaterQualityTableTmpl = require('./templates/catchmentWaterQualityTable.html'),
    catchmentWaterQualityTableRowTmpl = require('./templates/catchmentWaterQualityTableRow.html'),
    tabPanelTmpl = require('../modeling/templates/resultsTabPanel.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    barChartTmpl = require('../core/templates/barChart.html'),
    resultsWindowTmpl = require('./templates/resultsWindow.html'),
    modelSelectionDropdownTmpl = require('./templates/modelSelectionDropdown.html'),
    dataSourceButtonTmpl = require('./templates/dataSourceButton.html');

var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var ModelSelectionDropdownView = Marionette.ItemView.extend({
    template: modelSelectionDropdownTmpl,

    ui: {
        'modelPackageLinks': 'a.analyze-model-package-link',
    },

    events: {
        'click @ui.modelPackageLinks': 'selectModelPackage',
    },

    selectModelPackage: function(e) {
        e.preventDefault();

        var modelPackages = settings.get('model_packages'),
            modelPackageName = $(e.currentTarget).data('id'),
            modelPackage = lodash.find(modelPackages, {name: modelPackageName}),
            newProjectUrl = '/project/new/' + modelPackageName,
            projectUrl = '/project',
            alertView,
            aoiModel = new coreModels.GeoModel({
                shape: App.map.get('areaOfInterest'),
                place: App.map.get('areaOfInterestName')
            }),
            analysisResults = App.getAnalyzeCollection()
                                  .findWhere({taskName: 'analyze/land'})
                                  .get('result') || {},
            landResults = analysisResults.survey;

        if (modelPackageName === 'gwlfe' && settings.get('mapshed_max_area')) {
            var areaInSqKm = utils.changeOfAreaUnits(aoiModel.get('area'),
                                                     aoiModel.get('units'),
                                                     'km<sup>2</sup>'),
                mapshedMaxArea = settings.get('mapshed_max_area');

            if (areaInSqKm > mapshedMaxArea) {
                alertView = new modalViews.AlertView({
                    model: new modalModels.AlertModel({
                        alertMessage: "The selected Area of Interest is too big for " +
                                 "the Watershed Multi-Year Model. The currently " +
                                 "maximum supported size is " + mapshedMaxArea + " km².",
                        alertType: modalModels.AlertTypes.warn
                    })
                });
                alertView.render();
                return;
            }
        }

        if (landResults) {
            var landCoverTotal = lodash.sum(lodash.map(landResults.categories,
                    function(category) {
                        if (category.type === 'Open Water') {
                            return 0;
                        }
                        return category.area;
                    }));

            if (landCoverTotal === 0) {
                alertView = new modalViews.AlertView({
                    model: new modalModels.AlertModel({
                        alertMessage: "The selected Area of Interest doesn't " +
                                 "include any land cover to run the model.",
                        alertType: modalModels.AlertTypes.warn
                    })
                });

                alertView.render();
                return;
            }
        }

        if (!modelPackage.disabled) {
            if (settings.get('itsi_embed') && App.currentProject && !App.currentProject.get('needs_reset')) {
                var currModelPackageName = App.currentProject.get('model_package');
                if (modelPackageName === currModelPackageName) {
                    // Go to existing project
                    router.navigate(projectUrl, {trigger: true});
                } else {
                    var confirmNewProject = new modalViews.ConfirmView({
                        model: new modalModels.ConfirmModel({
                            question: 'If you change the model you will lose your current work.',
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
        }
    },

    templateHelpers: function() {
        return {
            modelPackages: settings.get('model_packages')
        };
    },
});

var DataSourceButtonView = Marionette.ItemView.extend({
    template: dataSourceButtonTmpl,

    ui: {
        'dataSourceButton': '#data-source-button',
    },

    events: {
        'click @ui.dataSourceButton': 'navigateSearchDataSource',
    },

    navigateSearchDataSource: function() {
        router.navigate('search', { trigger: true });
    },
});

var ResultsView = Marionette.LayoutView.extend({
    id: 'model-output-wrapper',
    className: 'analyze',
    tagName: 'div',
    template: resultsWindowTmpl,

    ui: {
        changeArea: '[data-action="change-area"]'
    },

    events: {
        'click @ui.changeArea': 'changeArea'
    },

    regions: {
        aoiRegion: '.aoi-region',
        analyzeRegion: '#analyze-tab-contents',
        nextStageRegion: '#next-stage-navigation-region',
    },

    onShow: function() {
        this.showAoiRegion();
        this.showDetailsRegion();
        if (settings.get('data_catalog_enabled')) {
            this.showDataSourceButton();
        } else {
            this.showModelSelectionDropdown();
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
    },

    showDataSourceButton: function() {
        this.nextStageRegion.show(new DataSourceButtonView());
    },

    showModelSelectionDropdown: function() {
        this.nextStageRegion.show(new ModelSelectionDropdownView());
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
            fit = lodash.isUndefined(fitToBounds) ? true : fitToBounds;

        this.$el.animate({ width: '400px', opacity: 1 }, 200, function() {
            App.map.setAnalyzeSize(fit);
            self.trigger('animateIn');
        });
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

    initialize: function() {
        this.listenTo(this.model, 'change:polling', this.render);
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
        resultRegion: '.result-region'
    },

    onShow: function() {
        this.showAnalyzingMessage();

        this.model.fetchAnalysisIfNeeded()
            .done(lodash.bind(this.showResultsIfNotDestroyed, this))
            .fail(lodash.bind(this.showErrorIfNotDestroyed, this));
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
        } else {
            tmvModel.setError('Error');
        }

        this.resultRegion.show(new coreViews.TaskMessageView({
            model: tmvModel
        }));
        this.model.set({ polling: false });
    },

    showErrorIfNotDestroyed: function(err) {
        if (!this.isDestroyed) {
            this.showErrorMessage(err);
        }
    },

    showResults: function() {
        var name = this.model.get('name'),
            result = this.model.get('result').survey,
            resultModel = new models.LayerModel(result),
            ResultView = AnalyzeResultViews[name];

        this.resultRegion.show(new ResultView({
            model: resultModel
        }));
        this.model.set({ polling: false });
    },

    showResultsIfNotDestroyed: function() {
        if (!this.isDestroyed) {
            this.showResults();
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
    template: aoiHeaderTmpl
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
                this.layerGroup.fetchLayers(App.getLeafletMap());
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
            code = isLandTable ? this.model.get('nlcd') : null;

        return {
            // Convert coverage to percentage for display.
            coveragePct: (this.model.get('coverage') * 100),
            // Scale the area to display units.
            scaledArea: utils.changeOfAreaUnits(area, 'm<sup>2</sup>', units),
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
            isLandTable: this.options.modelName === 'land'
        };
    },
    templateHelpers: function() {
        return {
            headerUnits: this.options.units,
            isLandTable: this.options.modelName === 'land'
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
});

var ClimateTableView = Marionette.CompositeView.extend({
    childView: ClimateTableRowView,
    childViewContainer: 'tbody',
    template: climateTableTmpl,
    templateHelpers: function() {
        var data = this.collection.toJSON(),
            totalPpt = lodash(data).pluck('ppt').sum(),
            avgTmean = lodash(data).pluck('tmean').sum() / 12;

        return {
            totalPpt: totalPpt,
            avgTmean: avgTmean,
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
            lengthkm: this.model.get('lengthkm'),
            avgslope: this.model.get('avgslope'),
            noData: utils.noData,
        };
    }
});

var StreamTableView = Marionette.CompositeView.extend({
    childView: StreamTableRowView,
    childViewContainer: 'tbody',
    template: streamTableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        var data = lodash(this.collection.toJSON()),
            totalLength = data.pluck('lengthkm').sum(),
            avgChannelSlope = data.pluck('total_weighted_slope').sum() / totalLength,
            // Currently we only calculate agricultral percent for the entire
            // set, not per stream order, so we use the first value for total.
            agPercent = data.first().ag_stream_pct,
            lengthInAg = totalLength * agPercent,
            lengthInNonAg = totalLength - lengthInAg;

        return {
            totalLength: totalLength,
            avgChannelSlope: avgChannelSlope,
            lengthInAg: lengthInAg,
            lengthInNonAg: lengthInNonAg,
        };
    },
});

var PageableTableBaseView = Marionette.LayoutView.extend({
    tableView: null, // a View that renders a bootstrap table. Required

    template: pageableTableTmpl,
    regions: {
        'bootstrapTableRegion': '#bootstrap-table-region',
    },

    ui: {
        'nextPageBtn': '.btn-next-page',
        'prevPageBtn': '.btn-prev-page',
    },

    events: {
        'click @ui.nextPageBtn': 'nextPage',
        'click @ui.prevPageBtn': 'prevPage',
    },

    templateHelpers: function() {
        return {
            hasNextPage: this.collection.hasNextPage(),
            hasPreviousPage: this.collection.hasPreviousPage(),
            currentPage: this.collection.state.currentPage,
            totalPages: this.collection.state.totalPages,
        };
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

                self.render();
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

    nextPage: function() {
        if (this.collection.hasNextPage()) {
            this.collection.getNextPage();
            this.render();
        }
    },

    prevPage: function() {
        if (this.collection.hasPreviousPage()) {
            this.collection.getPreviousPage();
            this.render();
        }
    },

    onAttach: function() {
        this.renderBootstrapTable();
    },

    onRender: function() {
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
        return {
            val: this.model.get('value'),
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
        return {
            totalMGD: utils.totalForPointSourceCollection(
                this.collection.fullCollection.models, 'mgd'),
            totalKGN: utils.totalForPointSourceCollection(
                this.collection.fullCollection.models, 'kgn_yr'),
            totalKGP: utils.totalForPointSourceCollection(
                this.collection.fullCollection.models, 'kgp_yr'),
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
        return {
            val: this.model.get('value'),
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
        return {
            headerUnits: this.options.units,
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
        if (name === 'land') {
            return 'nlcd-fill-' + item.nlcd;
        } else if (name === 'soil') {
            return 'soil-fill-' + item.code;
        }
    },

    addChart: function() {
        var self = this,
            chartEl = this.$el.find('.bar-chart').get(0),
            data = lodash.map(this.collection.toJSON(), function(model) {
                return {
                    x: model.type,
                    y: model.coverage,
                    class: self.getBarClass(model)
                };
            }),

            chartOptions = {
               yAxisLabel: 'Coverage',
               isPercentage: true,
               barClasses: lodash.pluck(data, 'class')
           };

        chart.renderHorizontalBarChart(chartEl, data, chartOptions);
    }
});

var AnalyzeResultView = Marionette.LayoutView.extend({
    template: analyzeResultsTmpl,
    regions: {
        descriptionRegion: '.desc-region',
        selectorRegion: '.selector-region',
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

    downloadCSV: function() {
        var data = this.model.get('categories'),
            dataName = this.model.get('name'),
            timestamp = new Date().toISOString(),
            filename = '';

        switch (dataName) {
            case 'land':
                filename = 'nlcd_land_cover_';
                break;
            case 'soil':
                filename = 'nlcd_soils_';
                break;
            case 'animals':
                filename = 'animal_estimate_';
                break;
            case 'pointsource':
                filename = 'pointsource_';
                break;
            case 'catchment_water_quality':
                filename = 'catchment_water_quality_';
                break;
            default:
                filename = this.model.get('name');
                break;
        }

        filename = filename + timestamp;

        // Render an unpaginated table for tables that can be paginated.
        if (dataName === 'pointsource' || dataName === 'catchment_water_quality') {
            var largestArea = lodash.max(lodash.pluck(data, 'area')),
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
            largestArea = lodash.max(lodash.pluck(categories, 'area')),
            units = utils.magnitudeOfArea(largestArea),
            census = new CategoriesToCensus(categories);

        if (pageSize) {
            census.setPageSize(pageSize);
        }

        this.tableRegion.show(new AnalyzeTableView({
            units: units,
            collection: census,
            modelName: this.model.get('name')
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
    onShow: function() {
        var title = 'Land cover distribution',
            source = 'National Land Cover Database (NLCD 2011)',
            helpText = 'For more information and data sources, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage\' target=\'_blank\' rel=\'noreferrer noopener\'>Model My Watershed Technical Documentation on Coverage Grids</a>',
            associatedLayerCodes = ['nlcd'];
        this.showAnalyzeResults(coreModels.LandUseCensusCollection, TableView,
            ChartView, title, source, helpText, associatedLayerCodes);
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

var SelectorView = Marionette.ItemView.extend({
    template: selectorTmpl,

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
            activeVar = this.model.get('activeVar'),
            config = activeVar === 'ppt' ?
                {label: 'Water Depth (cm)', unit: 'cm', key: 'Mean Precipitation'} :
                {label: 'Temperature (°C)', unit: '°C', key: 'Mean Temperature'  },
            data = [
                {
                    key: config.key,
                    values: this.collection.map(function(model, idx) {
                        return {
                            x: idx,
                            y: model.get(activeVar)
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
                xTickValues: lodash.range(12),
                yTickFormat: '0.01f',
            };

        $(chartEl).empty();

        chart.renderLineChart(chartEl, data, chartOptions);
    }
});

var ClimateResultView = AnalyzeResultView.extend({
    initialize: function() {
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

        this.selectorRegion.show(new SelectorView({
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
        var title = 'Stream Network Statistics',
            source = 'NHDplusV2',
            helpText = 'For more information on the data source, see <a href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-in-layers-streams\' target=\'_blank\' >MMW Technical Documentation</a>',
            associatedLayerCodes = ['nhd_streams_v2'],
            chart = null;

        this.showAnalyzeResults(coreModels.StreamsCensusCollection, StreamTableView,
                                chart, title,source, helpText, associatedLayerCodes);
    },
});

var AnalyzeResultViews = {
    land: LandResultView,
    soil: SoilResultView,
    animals: AnimalsResultView,
    pointsource: PointSourceResultView,
    catchment_water_quality: CatchmentWaterQualityResultView,
    climate: ClimateResultView,
    streams: StreamResultView,
};

module.exports = {
    ResultsView: ResultsView,
    AnalyzeWindow: AnalyzeWindow,
    AnalyzeResultViews: AnalyzeResultViews,
    AoiView: AoiView,
};
