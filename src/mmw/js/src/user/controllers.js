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

    itsiSignUp: function(username, first_name, last_name, queryParams) {
        new views.ItsiSignUpModalView({
            app: App,
            model: new models.ItsiSignUpFormModel({
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
