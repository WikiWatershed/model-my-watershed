"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../../shim/backbone.marionette'),
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
    windowTmpl = require('./templates/window.html'),
    detailsTmpl = require('../modeling/templates/resultsDetails.html'),
    aoiHeaderTmpl = require('./templates/aoiHeader.html'),
    tableTmpl = require('./templates/table.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
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
            model: this.model
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
        detailsRegion: {
            el: '#analyze-details-region'
        }
    },

    onShow: function() {
        this.showAnalyzingMessage();

        var self = this;

        if (!this.model.get('result')) {
            var aoi = JSON.stringify(this.model.get('area_of_interest')),
                taskHelper = {
                    pollSuccess: function() {
                        self.showDetailsRegion();
                    },

                    pollFailure: function() {
                        self.showErrorMessage();
                    },

                    startFailure: function() {
                        self.showErrorMessage();
                    },

                    postData: {'area_of_interest': aoi}
                };

            this.model.start(taskHelper);
        } else {
            self.showDetailsRegion();
        }
    },

    showAnalyzingMessage: function() {
        var messageModel = new coreModels.TaskMessageViewModel();

        messageModel.setWorking('Analyzing');

        this.detailsRegion.show(new coreViews.TaskMessageView({
            model: messageModel
        }));
    },

    showErrorMessage: function() {
        var messageModel = new coreModels.TaskMessageViewModel();

        messageModel.setError();

        this.detailsRegion.show(new coreViews.TaskMessageView({
            model: messageModel
        }));
    },

    showDetailsRegion: function() {
        var results = JSON.parse(this.model.get('result'));

        if (!this.isDestroyed) {
            this.detailsRegion.show(new DetailsView({
                collection: new models.LayerCollection(results)
            }));
        }
    }
});

var DetailsView = Marionette.LayoutView.extend({
    template: detailsTmpl,
    regions: {
        panelsRegion: '.tab-panels-region',
        contentRegion: '.tab-contents-region'
    },

    onShow: function() {
        this.panelsRegion.show(new TabPanelsView({
            collection: this.collection
        }));

        this.contentRegion.show(new TabContentsView({
            collection: this.collection
        }));
    }
});

var TabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: tabPanelTmpl,
    attributes: {
        role: 'presentation'
    }
});

var TabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },
    childView: TabPanelView,

    events: {
        'shown.bs.tab li a ': 'triggerBarChartRefresh'
    },

    triggerBarChartRefresh: function() {
        $('#analyze-output-wrapper .bar-chart').trigger('bar-chart:refresh');
    },

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
        aoiRegion: '.analyze-aoi-region',
        tableRegion: '.analyze-table-region',
        chartRegion: '.analyze-chart-region'
    },
    onShow: function() {
        var categories = this.model.get('categories'),
            largestArea = _.max(_.pluck(categories, 'area')),
            units = utils.magnitudeOfArea(largestArea),
            census = this.model.get('name') === 'land' ?
                new coreModels.LandUseCensusCollection(categories) :
                new coreModels.SoilCensusCollection(categories);

        this.aoiRegion.show(new AoiView({
            model: new coreModels.GeoModel({
                place: App.map.get('areaOfInterestName'),
                shape: App.map.get('areaOfInterest')
            })
        }));

        this.tableRegion.show(new TableView({
            units: units,
            collection: census
        }));

        this.chartRegion.show(new ChartView({
            model: this.model,
            collection: census
        }));
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

module.exports = {
    ResultsView: ResultsView,
    AnalyzeWindow: AnalyzeWindow,
    DetailsView: DetailsView
};
