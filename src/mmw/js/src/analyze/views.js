"use strict";

var $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    chart = require('../core/chart'),
    windowTmpl = require('./templates/window.html'),
    messageTmpl = require('./templates/message.html'),
    detailsTmpl = require('./templates/details.html'),
    tableTmpl = require('./templates/table.html'),
    tableRowTmpl = require('./templates/tableRow.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    barChartTmpl = require('../core/templates/barChart.html');

var AnalyzeWindow = Marionette.LayoutView.extend({
    id: 'analyze-output-wrapper',
    template: windowTmpl,

    regions: {
        headerRegion: '#analyze-header-region',
        detailsRegion: {
            el: '#analyze-details-region'
        }
    },

    initialize: function() {
        this.listenTo(this, 'animateIn', function() {
            $('#analyze-output-wrapper .bar-chart').trigger('bar-chart:refresh');
        });
    },

    onShow: function() {
        this.showHeaderRegion();
        this.showAnalyzingMessage();

        var self = this;

        if (!this.model.get('result')) {
            var taskHelper = {
                pollSuccess: function() {
                    self.showDetailsRegion();
                },

                pollFailure: function() {
                    self.showErrorMessage();
                },

                startFailure: function() {
                    self.showErrorMessage();
                }
            };
            this.model.start(taskHelper);
        } else {
            this.lock = $.Deferred();
            this.lock.done(function() {
                self.showDetailsRegion();
            });
        }
    },

    showHeaderRegion: function() {
        this.headerRegion.show(new coreViews.AreaOfInterestView({
            App: App,
            model: new coreModels.AreaOfInterestModel({
                shape: this.model.get('area_of_interest'),
                place: App.map.get('areaOfInterestName'),
                can_go_back: true,
                next_label: 'Model',
                url: 'project'
            })
        }));
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

        this.$el.animate({ height: '55%' }, 200, function() {
            self.trigger('animateIn');
            App.map.setHalfSize(true);
        });
        if (this.lock !== undefined) {
            this.lock.resolve();
        }
    },

    animateOut: function() {
        var self = this;

        App.map.setFullSize(true);
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
        var dataCollection = new coreModels.DataCollection(
            this.model.get('categories')
        );

        this.tableRegion.show(new TableView({
            collection: dataCollection
        }));

        this.chartRegion.show(new ChartView({
            model: this.model,
            collection: dataCollection
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
    template: tableRowTmpl
});

var TableView = Marionette.CompositeView.extend({
    childView: TableRowView,
    childViewContainer: 'tbody',
    template: tableTmpl
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

    addChart: function() {
        var selector = '#' + this.id() + ' .bar-chart',
            chartData = this.collection.map(function(model) {
                return model.attributes;
            }),
            chartOptions = {
                isPercentage: true,
                depAxisLabel: 'Coverage'
            },
            depVars = ['coverage'],
            indVar = 'type';

        if (this.model.get('name') === 'land') {
            chartOptions.useHorizBars = true;
        }
        chart.makeBarChart(selector, chartData, indVar, depVars, chartOptions);
    }
});

module.exports = {
    AnalyzeWindow: AnalyzeWindow,
    DetailsView: DetailsView
};
