"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    charts = require('./chart'),
    windowTmpl = require('./templates/window.ejs'),
    headerTmpl = require('./templates/header.ejs'),
    detailsTmpl = require('./templates/details.ejs'),
    tableTmpl = require('./templates/table.ejs'),
    tableRowTmpl = require('./templates/tableRow.ejs'),
    tabPanelTmpl = require('./templates/tabPanel.ejs'),
    tabContentTmpl = require('./templates/tabContent.ejs'),
    chartTmpl = require('./templates/chart.ejs');

var AnalyzeWindow = Marionette.LayoutView.extend({
    tagName: 'div',
    id: 'analyze-output-wrapper',
    template: windowTmpl,

    initialize: function() {
        var self = this;

        this.model.fetch({ method: 'POST' })
                .done(function() {
                    self.model.pollForResults()
                        .done(_.bind(self.showDetailsRegion, self))
                        .fail(function() {
                            console.log('Failed to get analyze results');
                            // TODO: Show an error message across the whole
                            // analyze window
                        });
                })
                .fail(function() {
                    console.log('Failed to start analyze job');
                    // TODO: Show an error message across the whole
                    // analyze window
                });
    },

    regions: {
        headerRegion: '#analyze-header-region',
        detailsRegion: '#analyze-details-region'
    },

    onShow: function() {
        this.showHeaderRegion();
        // TODO: Show loading spinner until
        // model.pollForResults is finished
    },

    showHeaderRegion: function() {
        this.headerRegion.show(new HeaderView({
            model: new models.AnalyzeModel({})
        }));
    },

    showDetailsRegion: function() {
        var results = JSON.parse(this.model.get('result'));

        this.detailsRegion.show(new DetailsView({
            collection: new models.LayerCollection(results)
        }));
    },

    transitionInCss: {
        height: '0%'
    },

    animateIn: function() {
        var self = this;

        this.$el.animate({ height: '55%' }, 400, function() {
            self.trigger('animateIn');
            App.map.set('halfSize', true);
        });
    },

    animateOut: function() {
        var self = this;

        this.$el.animate({ height: '0%' }, 100, function() {
            self.trigger('animateOut');
            App.map.set('halfSize', false);
        });
    }
});

var HeaderView = Marionette.ItemView.extend({
    template: headerTmpl
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
        var categories = new models.LayerCategoryCollection(
                this.model.get('categories')
            );

        this.tableRegion.show(new TableView({
            collection: categories
        }));

        this.chartRegion.show(new ChartView({
            model: this.model,
            collection: categories
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
    template: chartTmpl,
    id: function() {
        return 'chart-' + this.model.get('name');
    },
    className: 'chart-container',

    onAttach: function() {
        this.addChart();
    },

    addChart: function() {
        var chartData = this.collection.map(function(model) {
                return model.attributes;
            }),
            selector = '#' + this.id() + ' .bar-chart',
            chartOptions = {};

        if (this.model.get('name') === 'land') {
            chartOptions.useHorizBars = true;
        }
        charts.makeBarChart(selector, chartData, 'type', 'coverage', chartOptions);
    }
});

module.exports = {
    AnalyzeWindow: AnalyzeWindow
};
