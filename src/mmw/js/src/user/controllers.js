"use strict";

var App = require('../app'),
    utils = require('../core/utils'),
    models = require('./models'),
    views = require('./views');

var SignUpController = {
    signUp: function() {
        new views.SignUpModalView({
            app: App,
            model: new models.SignUpFormModel({})
        }).render();
    },

    ssoSignUp: function(provider, username, first_name, last_name, queryParams) {
        new views.SSOSignUpModalView({
            app: App,
            model: new models.SSOSignUpFormModel({
                provider: provider,
                username: username,
                first_name: first_name,
                last_name: last_name,
                next: queryParams ? utils.parseQueryString(queryParams).next : '/'
            })
        }).render();
    }
};

module.exports = {
    SignUpController: SignUpController
};
