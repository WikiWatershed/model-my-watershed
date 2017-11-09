"use strict";

var App = require('../app'),
    views = require('./views'),
    models = require('./models'),
    router = require('../router').router,
    coreUtils= require('../core/utils');

var AccountController = {
    accountPrepare: function() {
        App.rootView.geocodeSearchRegion.empty();
    },

    account: function() {
        showLoginOrAccountView();
    },

    accountCleanUp: function() {
        App.rootView.footerRegion.empty();
        App.showLayerPicker();
    }
};

function showAccountView() {
    App.rootView.footerRegion.show(
        new views.AccountContainerView({
            model: new models.AccountContainerModel()
        })
    );
    App.destroyLayerPicker();

    App.state.set('active_page', coreUtils.accountPageTitle);
}

function showLoginOrAccountView() {
    App.user.fetch().always(function() {
        if (App.user.get('guest')) {
            var loginSuccess = function() {
                router.navigate("/account", { trigger: true });
            };
            App.showLoginModal(loginSuccess);
            // Until the user has logged in, show the main page
            router.navigate("/", { trigger: true });
        } else {
            showAccountView();
        }
    });
}

module.exports = {
    AccountController: AccountController
};
