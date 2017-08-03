"use strict";

var App = require('../app'),
    router = require('../router').router,
    coreUtils = require('../core/utils'),
    models = require('./models'),
    views = require('./views');

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

        var form = new models.SearchForm();

        var catalogs = new models.Catalogs([
            new models.Catalog({
                id: 'cinergi',
                name: 'CINERGI',
                active: true,
                results: new models.Results(null, { catalog: 'cinergi' }),
            }),
            new models.Catalog({
                id: 'hydroshare',
                name: 'HydroShare',
                results: new models.Results(null, { catalog: 'hydroshare' }),
            }),
            new models.Catalog({
                id: 'cuahsi',
                name: 'WDC',
                description: 'Optional catalog description here...',
                results: new models.Results(null, { catalog: 'cuahsi' }),
            })
        ]);

        var view = new views.DataCatalogWindow({
            model: form,
            collection: catalogs
        });
        App.rootView.sidebarRegion.show(view);
    },

    dataCatalogCleanUp: function() {
        App.map.set({
            dataCatalogResults: null,
            dataCatalogActiveResult: null,
        });
        App.rootView.sidebarRegion.currentView.collection.forEach(
            function(catalogModel) {
                catalogModel.cancelSearch();
            }
        );
    }
};

module.exports = {
    DataCatalogController: DataCatalogController,
};
