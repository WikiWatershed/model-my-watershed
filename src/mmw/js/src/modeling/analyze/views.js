"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../../../shim/backbone.marionette'),
    App = require('../../app'),
    models = require('./models'),
    coreModels = require('../../core/models'),
    chart = require('../../core/chart'),
    utils = require('../../core/utils'),
    windowTmpl = require('./templates/window.html'),
    messageTmpl = require('./templates/message.html'),
    detailsTmpl = require('./templates/details.html'),
    tableTmpl = require('./templates/table.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    barChartTmpl = require('../../core/templates/barChart.html');

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
        var messageModel = new models.AnalyzeMessageModel();

        messageModel.setAnalyzing();

        this.detailsRegion.show(new MessageView({
            model: messageModel
        }));
    },

    showErrorMessage: function() {
        var messageModel = new models.AnalyzeMessageModel();

        messageModel.setError();

        this.detailsRegion.show(new MessageView({
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
    },

    transitionInCss: {
        height: '0%'
    },

    animateIn: function() {
        var self = this;

        App.map.setAnalyzeSize(true);

        this.$el.animate({ height: '55%' }, 200, function() {
            self.trigger('animateIn');
        });
    },

    animateOut: function() {
        var self = this;

        App.map.setDoubleHeaderSmallFooterSize(true);

        this.$el.animate({ height: '0%' }, 200, function() {
            self.trigger('animateOut');
        });
    }
});

var MessageView = Marionette.ItemView.extend({
    template: messageTmpl,
    className: 'analyze-message-region'
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

        this.tableRegion.show(new TableView({
            units: units,
            model: new coreModels.GeoModel({units: (units === 'km2') ? 'km<sup>2</sup>' : 'm<sup>2</sup>'}),
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
            scaledArea: utils.changeOfAreaUnits(area, 'm2', units)
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
    AnalyzeWindow: AnalyzeWindow,
    DetailsView: DetailsView
};
