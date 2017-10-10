"use strict";

var App = require('../app'),
    views = require('./views'),
    models = require('./models'),
    coreUtils= require('../core/utils');

var AccountController = {
    accountPrepare: function() {
        App.rootView.geocodeSearchRegion.empty();
    },

    account: function() {
        App.rootView.footerRegion.show(
            new views.AccountContainerView({
                model: new models.AccountContainerModel()
            })
        );

        App.rootView.layerPickerRegion.empty();

        App.state.set('active_page', coreUtils.accountPageTitle);
    },

    accountCleanUp: function() {
        App.rootView.footerRegion.empty();
        App.showLayerPicker();
    }
};

module.exports = {
    AccountController: AccountController
};
