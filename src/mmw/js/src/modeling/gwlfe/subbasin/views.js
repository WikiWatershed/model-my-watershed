"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    $ = require('jquery'),
    App = require('../../../app'),
    models = require('./models'),
    resultTmpl = require('./templates/result.html'),
    tableTabContentTmpl = require('./templates/tableTabContent.html'),
    tableTabPanelTmpl = require('./templates/tableTabPanel.html'),
    huc12TotalsTableTmpl = require('./templates/huc12TotalsTable.html'),
    sourcesTableTmpl = require('./templates/sourcesTable.html');

var ResultView = Marionette.LayoutView.extend({
    // model: ResultModel
    template: resultTmpl,

    regions: {
        tabPanelRegion: '.subbasin-tab-panel-region',
        tabContentRegion: '.subbasin-tab-content-region',
    },

    templateHelpers: function() {
        return {
            aoiDetails: App.currentProject.get('area_of_interest_name'),
        };
    },

    onShow: function() {
        var tabCollection = this.getTabCollection();
        this.tabPanelRegion.show(new TableTabPanelCollectionView({
            collection: tabCollection,
        }));
        this.tabContentRegion.show(new TableTabContentCollectionView({
            collection: tabCollection,
            model: this.model,
            showHuc12: this.options.showHuc12,
            huc12: this.options.huc12,
        }));
    },

    getTabCollection: function() {
        return new models.SubbasinTabCollection([
            new models.SubbasinTabModel({
                displayName: 'Sources',
                name: 'aoiSources',
            }),
            new models.SubbasinTabModel({
                displayName: 'HUC-12',
                name: 'huc12Totals',
            }),
        ]);
    },
});

var TableTabPanelView = Marionette.ItemView.extend({
    // model: SubbasinTabModel
    tagName: 'li',
    template: tableTabPanelTmpl,
    attributes: {
        role: 'presentation',
    },
});

var TableTabPanelCollectionView = Marionette.CollectionView.extend({
    // collection: SubbasinTabCollection
    tagName: 'ul',
    className: 'nav nav-tabs model-nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: TableTabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    },
});

var TableTabContentView = Marionette.LayoutView.extend({
    // model: SubbasinTabModel
    template: tableTabContentTmpl,
    tagName: 'div',
    className: 'tab-pane',
    attributes: {
        role: 'tabpanel',
    },
    regions: {
        tableRegion: '.table-region',
    },

    onShow: function() {
        var tableViewKey = this.model.get('name'),
            TableView = tableViews[tableViewKey];
        if (!TableView) {
            console.error('Use of table view key without TableView: ', tableViewKey);
            return null;
        }

        this.tableRegion.show(new TableView({
            model: this.options.result,
            huc12: this.options.huc12,
            showHuc12: this.options.showHuc12,
        }));
    },

    id: function() {
        return this.model.get('name');
    }
});

var TableTabContentCollectionView = Marionette.CollectionView.extend({
    // collection: SubbasinTabCollection
    tagName: 'div',
    className: 'tab-content model-tab-content',
    childView: TableTabContentView,
    childViewOptions: function() {
        return {
            result: this.model,
            huc12: this.options.huc12,
            showHuc12: this.options.showHuc12,
        };
    },
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

var SourcesTableView = Marionette.ItemView.extend({
    template: sourcesTableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        var result = this.getResult();
        return {
            rows: result.Loads,
            summaryRow: result.SummaryLoads,
        };
    },

    getResult: function() {
        return this.model.get('result');
    }
});

var Huc12SourcesTableView = SourcesTableView.extend({
    getResult: function() {
        return this.model.get('result').HUC12s[this.options.huc12];
    }
});

var Huc12TotalsTableView = Marionette.ItemView.extend({
    template: huc12TotalsTableTmpl,
    ui: {
        'rows': '.huc12-total',
    },
    events: {
        'click @ui.rows': 'handleRowClick',
    },
    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        var result = this.model.get('result');
        return {
            rows: result.HUC12s,
            subbasins: App.currentProject.get('subbasins'),
            summaryRow: result.SummaryLoads,
        };
    },

    handleRowClick: function(e) {
        this.options.showHuc12(e.currentTarget.getAttribute('data-huc12-id'));
    }
});

var Huc12ResultView = ResultView.extend({
    className: 'result-region',
    templateHelpers: function() {
        var subbasinDetail = App.currentProject.get('subbasins')
                                .get(this.options.huc12);
        return {
            aoiDetails: subbasinDetail.get('name') + ', HUC-12 Watershed',
        };
    },

    getTabCollection: function() {
        return new models.SubbasinTabCollection([
            new models.SubbasinTabModel({
                displayName: 'Sources',
                name: 'huc12Sources',
            }),
            new models.SubbasinTabModel({
                displayName: 'Catchments',
                name: 'catchments',
            }),
        ]);
    },
});


var tableViews = {
    aoiSources: SourcesTableView,
    huc12Totals: Huc12TotalsTableView,
    huc12Sources: Huc12SourcesTableView,
    // TODO CatchmentsTableView
    catchments: Huc12SourcesTableView,
};

module.exports = {
    ResultView: ResultView,
    Huc12ResultView: Huc12ResultView,
};
