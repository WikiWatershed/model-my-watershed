"use strict";

var App = require('../app'),
    models = require('./models'),
    views = require('./views');

var SignUpController = {
    signUp: function() {
        new views.SignUpModalView({
            app: App,
            model: new models.SignUpFormModel({})
        }).render();
    },

    itsiSignUp: function(username, first_name, last_name) {
        new views.ItsiSignUpModalView({
            app: App,
            model: new models.ItsiSignUpFormModel({
                username: username,
                first_name: first_name,
                last_name: last_name
            })
        }).render();
    }
};

module.exports = {
    SignUpController: SignUpController
};
