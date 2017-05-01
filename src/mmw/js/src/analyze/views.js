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
    coreUtils = require('../core/utils'),
    chart = require('../core/chart'),
    utils = require('../core/utils'),
    constants = require('./constants'),
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

var ModelSelectionDropdownView = Marionette.ItemView.extend({
    template: modelSelectionDropdownTmpl,

    ui: {
        'modelPackageLinks': 'a.model-package',
    },

    events: {
        'click @ui.modelPackageLinks': 'selectModelPackage',
    },

    selectModelPackage: function(e) {
        e.preventDefault();

        var modelPackages = settings.get('model_packages'),
            modelPackageName = $(e.target).data('id'),
            modelPackage = lodash.find(modelPackages, {name: modelPackageName}),
            newProjectUrl = '/project/new/' + modelPackageName,
            projectUrl = '/project',
            alertView,
            aoiModel = new coreModels.GeoModel({
                shape: App.map.get('areaOfInterest'),
                place: App.map.get('areaOfInterestName')
            }),
            analysisResults = JSON.parse(App.getAnalyzeCollection()
                                            .findWhere({taskName: 'analyze'})
                                            .get('result') || "{}"),
            landResults = lodash.find(analysisResults, function(element) {
                    return element.name === 'land';
            });

        if (modelPackageName === 'gwlfe' && settings.get('mapshed_max_area')) {
            var areaInSqKm = coreUtils.changeOfAreaUnits(aoiModel.get('area'),
                                                         aoiModel.get('units'),
                                                         'km<sup>2</sup>');

            if (areaInSqKm > settings.get('mapshed_max_area')) {
                alertView = new modalViews.AlertView({
                    model: new modalModels.AlertModel({
                        alertMessage: "The selected Area of Interest is too big for " +
                                 "the Watershed Multi-Year Model. The currently " +
                                 "maximum supported size is 1000 km².",
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

    regions: {
        analyzeRegion: '#analyze-tab-contents',
        nextStageRegion: '#next-stage-navigation-region',
    },

    onShow: function() {
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

    transitionInCss: {
        height: '0%'
    },

    animateIn: function(fitToBounds) {
        var self = this,
            fit = lodash.isUndefined(fitToBounds) ? true : fitToBounds;

        this.$el.animate({ width: '400px' }, 200, function() {
            App.map.setNoHeaderSidebarSize(fit);
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
        aoiRegion: '.aoi-region',
        resultRegion: '.result-region'
    },

    onShow: function() {
        this.aoiRegion.show(new AoiView({
            model: new coreModels.GeoModel({
                place: App.map.get('areaOfInterestName'),
                shape: App.map.get('areaOfInterest')
            })
        }));

        this.showAnalyzingMessage();

        this.model.get('taskRunner').fetchAnalysisIfNeeded()
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
            results = JSON.parse(this.model.get('taskRunner').get('result')).survey,
            result = lodash.find(results, { name: name }),
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
    className: 'tab-content analyze',
    childView: TabContentView,
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

var AoiView = Marionette.ItemView.extend({
    template: aoiHeaderTmpl
});

var AnalyzeDescriptionView = Marionette.ItemView.extend({
    template: AnalyzeDescriptionTmpl
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
        utils.toggleLayer(this.model, App.getLeafletMap(),
            App.getLayerTabCollection().findLayerGroup(this.model.get('layerType')));
        App.getLayerTabCollection().trigger('toggle:layer');
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
        layerTabCollection.trigger('toggle:layer');
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

var TableRowView = Marionette.ItemView.extend({
    tagName: 'tr',
    template: tableRowTmpl,
    templateHelpers: function() {
        var area = this.model.get('area'),
            units = this.options.units;

        return {
            // Convert coverage to percentage for display.
            coveragePct: (this.model.get('coverage') * 100),
            // Scale the area to display units.
            scaledArea: utils.changeOfAreaUnits(area, 'm<sup>2</sup>', units)
        };
    }
});

var TableView = Marionette.CompositeView.extend({
    childView: TableRowView,
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
            headerUnits: this.options.units,
            totalMGD: utils.totalForPointSourceCollection(
                this.collection.fullCollection.models, 'mgd'),
            totalKGN: utils.totalForPointSourceCollection(
                this.collection.fullCollection.models, 'kgn_yr'),
            totalKGP: utils.totalForPointSourceCollection(
                this.collection.fullCollection.models, 'kgp_yr'),
            hasNextPage: this.collection.hasNextPage(),
            hasPreviousPage: this.collection.hasPreviousPage(),
            currentPage: this.collection.state.currentPage,
            totalPages: this.collection.state.totalPages,
        };
    },
    childViewContainer: 'tbody',
    template: pointSourceTableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    ui: {
        'pointSourceTR': 'tr.point-source',
        'pointSourceId': '.point-source-id',
        'pointSourceTblNext': '.btn-next-page',
        'pointSourceTblPrev': '.btn-prev-page'
    },

    events: {
        'click @ui.pointSourceId': 'panToPointSourceMarker',
        'mouseout @ui.pointSourceId': 'removePointSourceMarker',
        'mouseover @ui.pointSourceTR': 'addPointSourceMarkerToMap',
        'mouseout @ui.pointSourceTR': 'removePointSourceMarker',
        'click @ui.pointSourceTblNext': 'nextPage',
        'click @ui.pointSourceTblPrev': 'prevPage'
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

    nextPage: function() {
        if (this.collection.hasNextPage()) {
            this.collection.getNextPage();
            this.render();
            $('[data-toggle="table"]').bootstrapTable();
        }
    },

    prevPage: function() {
        if (this.collection.hasPreviousPage()) {
            this.collection.getPreviousPage();
            this.render();
            $('[data-toggle="table"]').bootstrapTable();
        }
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
            hasNextPage: this.collection.hasNextPage(),
            hasPreviousPage: this.collection.hasPreviousPage(),
            currentPage: this.collection.state.currentPage,
            totalPages: this.collection.state.totalPages,
        };
    },
    childViewContainer: 'tbody',
    template: catchmentWaterQualityTableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    ui: {
        'catchmentWaterQualityTR': 'tr.catchment-water-quality',
        'catchmentWaterQualityId': '.catchment-water-quality-id',
        'catchmentWaterQualityTblNext': '.btn-next-page',
        'catchmentWaterQualityTblPrev': '.btn-prev-page',
    },

    events: {
        'click @ui.catchmentWaterQualityId': 'panToCatchmentPolygon',
        'mouseout @ui.catchmentWaterQualityId': 'removeCatchmentPolygon',
        'mouseover @ui.catchmentWaterQualityTR': 'addCatchmentToMap',
        'mouseout @ui.catchmentWaterQualityTR': 'removeCatchmentPolygon',
        'click @ui.catchmentWaterQualityTblNext': 'nextPage',
        'click @ui.catchmentWaterQualityTblPrev': 'prevPage',
    },

    nextPage: function() {
        if (this.collection.hasNextPage()) {
            this.collection.getNextPage();
            this.render();
            $('[data-toggle="table"]').bootstrapTable();
        }
    },

    prevPage: function() {
        if (this.collection.hasPreviousPage()) {
            this.collection.getPreviousPage();
            this.render();
            $('[data-toggle="table"]').bootstrapTable();
        }
    },

    createCatchmentPolygon: function(data) {
        var geom = utils.geomForIdInCatchmentWaterQualityCollection(this.collection.models,
            'nord', data.nord);
        var geoJson = {
            "type": "Feature",
            "geometry": JSON.parse(geom),
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
        var popUpLocationGeoJSON = utils.findCenterOfShapeIntersection(JSON.parse(geom), App.map.get('areaOfInterest'));
        this.catchmentPolygon.openPopup(L.GeoJSON.coordsToLatLng(popUpLocationGeoJSON.geometry.coordinates));
    },

    removeCatchmentPolygon: function() {
        var map = App.getLeafletMap();

        if (this.catchmentPolygon) {
            map.removeLayer(this.catchmentPolygon);
        }
    }
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
        layerToggleRegion: '.layer-region',
        descriptionRegion: '.desc-region',
        chartRegion: '.chart-region',
        tableRegion: '.table-region'
    },

    ui: {
        downloadCSV: '[data-action="download-csv"]'
    },

    events: {
        'click @ui.downloadCSV': 'downloadCSV'
    },

    downloadCSV: function() {
        var data = this.model.get('categories'),
            timestamp = new Date().toISOString(),
            filename,
            nameMap,
            renamedData;

        switch (this.model.get('name')) {
            case 'land':
                filename = 'nlcd_land_cover_' + timestamp;
                renamedData = utils.renameCSVColumns(data,
                    constants.csvColumnMaps.nlcd);
                break;
            case 'soil':
                filename = 'nlcd_soils_' + timestamp;
                renamedData = utils.renameCSVColumns(data,
                    constants.csvColumnMaps.soil);
                break;
            case 'animals':
                filename = 'animal_estimate_' + timestamp;
                renamedData = utils.renameCSVColumns(data,
                    constants.csvColumnMaps.animals);
                break;
            case 'pointsource':
                filename = 'pointsource_' + timestamp;
                renamedData = utils.renameCSVColumns(data,
                    constants.csvColumnMaps.pointSource);
                break;
            case 'catchment_water_quality':
                filename = 'catchment_water_quality_' + timestamp;
                renamedData = _.map(data, function(element) {
                    return _.omit(element, 'geom');
                });
                renamedData = utils.renameCSVColumns(renamedData,
                    constants.csvColumnMaps.waterQuality);
                break;
            default:
                filename = this.model.get('name') + '_' + timestamp;
                nameMap = {};
                renamedData = data;
        }

        utils.downloadDataCSV(renamedData, filename);
    },

    showAnalyzeResults: function(CategoriesToCensus, AnalyzeTableView,
        AnalyzeChartView, description, associatedLayerCodes, pageSize) {
        var categories = this.model.get('categories'),
            largestArea = lodash.max(lodash.pluck(categories, 'area')),
            units = utils.magnitudeOfArea(largestArea),
            census = new CategoriesToCensus(categories);

        if (pageSize) {
            census.setPageSize(pageSize);
        }

        this.tableRegion.show(new AnalyzeTableView({
            units: units,
            collection: census
        }));

        if (AnalyzeChartView) {
            this.chartRegion.show(new AnalyzeChartView({
                model: this.model,
                collection: census
            }));
        }

        if (description) {
            this.descriptionRegion.show(new AnalyzeDescriptionView({
                model: new Backbone.Model({
                    description: description
                })
            }));
        }

        if (associatedLayerCodes) {
            if (associatedLayerCodes.length === 1) {
                this.layerToggleRegion.show(new AnalyzeLayerToggleView({
                    code: _.first(associatedLayerCodes)
                }));
            } else {
                this.layerToggleRegion.show(new AnalyzeLayerToggleDropdownView({
                    collection: new Backbone.Collection(_.map(associatedLayerCodes, function(code) {
                        return App.getLayerTabCollection().findLayerWhere({ code: code });
                    })),
                }));
            }
        }
    }
});

var LandResultView  = AnalyzeResultView.extend({
    onShow: function() {
        var desc = 'Land cover distribution from National Land Cover Database (NLCD 2011)',
            associatedLayerCodes = ['nlcd'];
        this.showAnalyzeResults(coreModels.LandUseCensusCollection, TableView,
            ChartView, desc, associatedLayerCodes);
    }
});

var SoilResultView  = AnalyzeResultView.extend({
    onShow: function() {
        var desc = 'Hydrologic soil group distribution from USDA (gSSURGO 2016)',
            associatedLayerCodes = ['soil'];
        this.showAnalyzeResults(coreModels.SoilCensusCollection, TableView,
            ChartView, desc, associatedLayerCodes);
    }
});

var AnimalsResultView = AnalyzeResultView.extend({
    onShow: function() {
        var desc = 'Estimated number of farm animals',
            chart = null;
        this.showAnalyzeResults(coreModels.AnimalCensusCollection, AnimalTableView,
            chart, desc);
    }
});

var PointSourceResultView = AnalyzeResultView.extend({
    onShow: function() {
        var desc = 'Discharge Monitoring Report annual averages from EPA NPDES',
            associatedLayerCodes = ['pointsource'],
            avgRowHeight = 30,  // Most rows are between 2-3 lines, 12px per line
            minScreenHeight = 768 + 45, // height of landscape iPad + extra content below the table
            pageSize = utils.calculateVisibleRows(minScreenHeight, avgRowHeight, 3),
            chart = null;
        this.showAnalyzeResults(coreModels.PointSourceCensusCollection,
            PointSourceTableView, chart, desc, associatedLayerCodes, pageSize);
    }
});

var CatchmentWaterQualityResultView = AnalyzeResultView.extend({
    onShow: function() {
        var desc = 'Delaware River Basin only: <a target="_blank" ' +
                   'href="https://www.arcgis.com/home/item.html?id=260d7e17039d48a6beee0f0b640eb754">' +
                   'Stream Reach Assessment Tool</a> model estimates',
            associatedLayerCodes = [
                'drb_catchment_water_quality_tn',
                'drb_catchment_water_quality_tp',
                'drb_catchment_water_quality_tss',
            ],
            avgRowHeight = 18,  // Most rows are between 1-2 lines, 12px per line
            minScreenHeight = 768 + 45, // height of landscape iPad + extra content below the table
            pageSize = utils.calculateVisibleRows(minScreenHeight, avgRowHeight, 5),
            chart = null;
        this.showAnalyzeResults(coreModels.CatchmentWaterQualityCensusCollection,
            CatchmentWaterQualityTableView, chart, desc, associatedLayerCodes, pageSize);
    }
});

var AnalyzeResultViews = {
    land: LandResultView,
    soil: SoilResultView,
    animals: AnimalsResultView,
    pointsource: PointSourceResultView,
    catchment_water_quality: CatchmentWaterQualityResultView,
};

module.exports = {
    ResultsView: ResultsView,
    AnalyzeWindow: AnalyzeWindow,
    AnalyzeResultViews: AnalyzeResultViews,
};
