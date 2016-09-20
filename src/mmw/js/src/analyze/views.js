"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
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
    windowTmpl = require('./templates/window.html'),
    analyzeResultsTmpl = require('./templates/analyzeResults.html'),
    aoiHeaderTmpl = require('./templates/aoiHeader.html'),
    tableTmpl = require('./templates/table.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
    animalTableTmpl = require('./templates/animalTable.html'),
    animalTableRowTmpl = require('./templates/animalTableRow.html'),
    pointSourceTableTmpl = require('./templates/pointSourceTable.html'),
    pointSourceTableRowTmpl = require('./templates/pointSourceTableRow.html'),
    tabPanelTmpl = require('../modeling/templates/resultsTabPanel.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    barChartTmpl = require('../core/templates/barChart.html'),
    resultsWindowTmpl = require('./templates/resultsWindow.html');

var ResultsView = Marionette.LayoutView.extend({
    id: 'model-output-wrapper',
    className: 'analyze',
    tagName: 'div',
    template: resultsWindowTmpl,

    regions: {
        analyzeRegion: '#analyze-tab-contents'
    },

    ui: {
        'modelPackageLinks': 'a.model-package',
    },

    events: {
        'click @ui.modelPackageLinks': 'selectModelPackage',
    },

    selectModelPackage: function (e) {
        e.preventDefault();

        var modelPackages = settings.get('model_packages'),
            modelPackageName = $(e.target).data('id'),
            modelPackage = _.find(modelPackages, {name: modelPackageName}),
            newProjectUrl = '/project/new/' + modelPackageName,
            projectUrl = '/project';

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

    onShow: function() {
        this.showDetailsRegion();
    },

    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    },

    showDetailsRegion: function() {
        this.analyzeRegion.show(new AnalyzeWindow({
            collection: this.collection
        }));
    },

    templateHelpers: function() {
        return {
            modelPackages: settings.get('model_packages')
        };
    },

    transitionInCss: {
        height: '0%'
    },

    animateIn: function(fitToBounds) {
        var self = this,
            fit = _.isUndefined(fitToBounds) ? true : fitToBounds;

        this.$el.animate({ width: '400px' }, 200, function() {
            App.map.setNoHeaderSidebarSize(fit);
            self.trigger('animateIn');
        });
    },

    animateOut: function(fitToBounds) {
        var self = this,
            fit = _.isUndefined(fitToBounds) ? true : fitToBounds;

        // Change map to full size first so there isn't empty space when
        // results window animates out
        App.map.setDoubleHeaderSmallFooterSize(fit);

        this.$el.animate({ width: '0px' }, 200, function() {
            self.trigger('animateOut');
        });
    }
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
            .done(_.bind(this.showResultsIfNotDestroyed, this))
            .fail(_.bind(this.showErrorIfNotDestroyed, this));
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
            results = JSON.parse(this.model.get('taskRunner').get('result')),
            result = _.find(results, { name: name }),
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
    className: 'tab-content',
    childView: TabContentView,
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

var AoiView = Marionette.ItemView.extend({
    template: aoiHeaderTmpl
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
                this.collection.models, 'mgd'),
            totalKGN: utils.totalForPointSourceCollection(
                this.collection.models, 'kgn_yr'),
            totalKGP: utils.totalForPointSourceCollection(
                this.collection.models, 'kgp_yr')
        };
    },
    childViewContainer: 'tbody',
    template: pointSourceTableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    ui: {
        'pointSourceTR': 'tr.point-source',
        'pointSourceId': '.point-source-id'
    },

    events: {
        'click @ui.pointSourceId': 'panToPointSourceMarker',
        'mouseout @ui.pointSourceId': 'removePointSourceMarker',
        'mouseover @ui.pointSourceTR': 'addPointSourceMarkerToMap',
        'mouseout @ui.pointSourceTR': 'removePointSourceMarker'
    },

    createPointSourceMarker: function(data) {
        var latLng = L.latLng([data.lat, data.lng]);

        this.marker = L.circleMarker(latLng, {
            fillColor: "#ff7800",
            weight: 0,
            fillOpacity: 0.75
        }).bindPopup(new pointSourceLayer.PointSourcePopupView({
          model: new Backbone.Model(data)
        }).render().el);
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
            return 'nlcd-' + item.nlcd;
        } else if (name === 'soil') {
            return 'soil-' + item.code;
        }
    },

    addChart: function() {
        var self = this,
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
               barClasses: _.pluck(data, 'class')
           };

        chart.renderHorizontalBarChart(chartEl, data, chartOptions);
    }
});

var AnalyzeResultView = Marionette.LayoutView.extend({
    template: analyzeResultsTmpl,
    regions: {
        chartRegion: '.chart-region',
        tableRegion: '.table-region'
    },

    showAnalyzeResults: function(CategoriesToCensus, AnalyzeTableView, AnalyzeChartView) {
        var categories = this.model.get('categories'),
            largestArea = _.max(_.pluck(categories, 'area')),
            units = utils.magnitudeOfArea(largestArea),
            census = new CategoriesToCensus(categories);

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
    }
});

var LandResultView  = AnalyzeResultView.extend({
    onShow: function() {
        this.showAnalyzeResults(coreModels.LandUseCensusCollection, TableView, ChartView);
    }
});

var SoilResultView  = AnalyzeResultView.extend({
    onShow: function() {
        this.showAnalyzeResults(coreModels.SoilCensusCollection, TableView, ChartView);
    }
});

var AnimalsResultView = AnalyzeResultView.extend({
    onShow: function() {
        this.showAnalyzeResults(coreModels.AnimalCensusCollection, AnimalTableView);
    }
});

var PointSourceResultView = AnalyzeResultView.extend({
    onShow: function() {
        this.showAnalyzeResults(coreModels.PointSourceCensusCollection, PointSourceTableView);
    }
});

var AnalyzeResultViews = {
    land: LandResultView,
    soil: SoilResultView,
    animals: AnimalsResultView,
    pointsource: PointSourceResultView,
};

module.exports = {
    ResultsView: ResultsView,
    AnalyzeWindow: AnalyzeWindow,
    AnalyzeResultViews: AnalyzeResultViews,
};
