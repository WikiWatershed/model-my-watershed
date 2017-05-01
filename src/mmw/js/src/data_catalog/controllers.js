"use strict";

var App = require('../app'),
    router = require('../router').router,
    utils = require('../core/utils'),
    views = require('./views');

var DataCatalogController = {
    dataCatalogPrepare: function() {
        if (!App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }

        // The mask layer should always be applied to the map when entering
        // data catalog mode
        if (!App.map.get('maskLayerApplied')) {
            App.map.set('maskLayerApplied', true);
        }

    },

    dataCatalog: function() {
        App.map.setDataCatalogSize();

        App.state.set({
            'active_page': utils.dataCatalogPageTitle,
            'was_data_catalog_visible': true,
        });

        var dataCatalogWindow = new views.DataCatalogWindow();

        App.rootView.sidebarRegion.show(dataCatalogWindow);
    },

    dataCatalogCleanUp: function() {
        App.rootView.sidebarRegion.empty();
    }
};

module.exports = {
    DataCatalogController: DataCatalogController,
};
