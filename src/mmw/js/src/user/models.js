"use strict";

var Backbone = require('../../shim/backbone');

var UserModel = Backbone.Model.extend({
    url: 'user/ajaxlogin'
});

var LoginFormModel = Backbone.Model.extend({
    defaults: {
        validationError: null,
        username: null,
        password: null,
        signInError: null
    },

    validate: function(attrs, options) {
        var errors = [];

        this.set('validationError', null);
        this.set('signInError', null);

        if (!attrs.username) {
            errors.push('Please enter a username');
        }

        if (!attrs.password) {
            errors.push('Please enter a password');
        }

        if (errors.length >= 1) {
            this.set('validationError', errors);
            return errors;
        }
    }
});

module.exports = {
    UserModel: UserModel,
    LoginFormModel: LoginFormModel
};
