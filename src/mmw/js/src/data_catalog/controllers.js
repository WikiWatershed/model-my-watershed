"use strict";

var App = require('../app'),
    coreUtils = require('../core/utils'),
    models = require('./models'),
    views = require('./views');

var DataCatalogController = {
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
                results: new models.Results()
            }),
            new models.Catalog({
                id: 'hydroshare',
                name: 'HydroShare',
                results: new models.Results()
            }),
            new models.Catalog({
                id: 'cuahsi',
                name: 'WDC',
                description: 'Optional catalog description here...',
                results: new models.Results()
            })
        ]);

        var view = new views.DataCatalogWindow({
            model: form,
            collection: catalogs
        });
        App.rootView.sidebarRegion.show(view);
    }
};

module.exports = {
    DataCatalogController: DataCatalogController,
};
