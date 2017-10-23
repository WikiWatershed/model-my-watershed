"use strict";

var turfArea = require('turf-area'),
    moment = require('moment'),
    App = require('../app'),
    router = require('../router').router,
    coreUtils = require('../core/utils'),
    models = require('./models'),
    views = require('./views');

var MAX_UNCAPPED_AOI = 1500000000;  // 1,500 km²

var DataCatalogController = {
    dataCatalogPrepare: function() {
        if (!App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }
    },

    dataCatalog: function() {
        App.map.setDataCatalogSize();

        App.state.set({
            'active_page': coreUtils.dataCatalogPageTitle,
        });

        var aoiArea = turfArea(App.map.get('areaOfInterest')),
            fromDate = aoiArea < MAX_UNCAPPED_AOI ? null :
                       moment().subtract(5, 'years').format('L'),

            form = new models.SearchForm(),
            dateFilter = new models.DateFilter({ fromDate: fromDate }),

            catalogs = new models.Catalogs([
                new models.Catalog({
                    id: 'cinergi',
                    name: 'CINERGI',
                    active: true,
                    results: new models.Results(null, { catalog: 'cinergi' }),
                    filters: new models.FilterCollection([dateFilter])
                }),
                new models.Catalog({
                    id: 'hydroshare',
                    name: 'HydroShare',
                    results: new models.Results(null, { catalog: 'hydroshare' }),
                    filters: new models.FilterCollection([dateFilter])
                }),
                new models.Catalog({
                    id: 'cuahsi',
                    name: 'WDC',
                    is_pageable: false,
                    results: new models.Results(null, { catalog: 'cuahsi' }),
                    filters: new models.FilterCollection([
                        dateFilter,
                        new models.GriddedServicesFilter()
                    ])
                })
            ]),

            resultsWindow = new views.ResultsWindow({
                model: form,
                collection: catalogs
            }),
            header = new views.HeaderView();

        App.rootView.subHeaderRegion.show(header);
        App.rootView.sidebarRegion.show(resultsWindow);
    },

    dataCatalogCleanUp: function() {
        App.map.set({
            dataCatalogResults: null,
            dataCatalogActiveResult: null,
            dataCatalogDetailResult: null,
        });
        App.rootView.sidebarRegion.currentView.collection.forEach(
            function(catalogModel) {
                catalogModel.cancelSearch();
            }
        );
        App.rootView.subHeaderRegion.empty();
    }
};

module.exports = {
    DataCatalogController: DataCatalogController,
};
