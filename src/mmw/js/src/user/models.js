"use strict";

var Backbone = require('../../shim/backbone');

var UserModel = Backbone.Model.extend({
    defaults: {
        guest: true
    },

    url: 'user/login',

    // Both login and logout methods return jqXHR objects so that callbacks can
    // be specified upon usage. They both update the user model, so any event
    // listeners that subscribe to the `sync` event will be triggered.
    login: function(attrs) {
        return this.fetch({
            type: 'POST',
            url: 'user/login',
            data: attrs
        });
    },

    logout: function() {
        var jqXHR = this.fetch({
            url: 'user/logout'
        });

        var user = this;
        jqXHR.done(function() {
            // We have to unset the username manually here because when the
            // server does not return a username (because the user has been
            // logged out), our model's username is not updated and the old
            // username persists.
            // Additionally, we change this silently because the login and
            // logout functions only advertise firing a single `sync` event,
            // and this would fire an additional `change` event. We must
            // suppress this to maintain consistency in our API.
            user.unset('username', {silent: true});
        });

        return jqXHR;
    }
});

var LoginFormModel = Backbone.Model.extend({
    defaults: {
        validationErrors: null,
        username: null,
        password: null,
        loginError: null
    },

    validate: function(attrs, options) {
        var errors = [];

        this.set('validationErrors', null);
        this.set('loginError', null);

        if (!attrs.username) {
            errors.push('Please enter a username');
        }

        if (!attrs.password) {
            errors.push('Please enter a password');
        }

        if (errors.length >= 1) {
            this.set('validationErrors', errors);
            return errors;
        }
    }
});

var SignUpFormModel = Backbone.Model.extend({
    defaults: {
        username: null,
        password1: null,
        password2: null,
        email: null,
        agreed: false,
        clientErrors: null,
        serverErrors: null,
        success: false
    },

    url: 'user/sign_up',

    validate: function(attrs, options) {
        var errors = [];

        this.set({
            'clientErrors': null,
            'serverErrors': null
        });

        if (!attrs.username) {
            errors.push('Please enter a username');
        }

        if (!attrs.email) {
            errors.push('Please enter an email addresss');
        }

        if (!attrs.password1) {
            errors.push('Please enter a password');
        }

        if (!attrs.password2) {
            errors.push('Please repeat the password');
        }

        if (!attrs.agreed) {
            errors.push('Please check the agreement');
        }

        if (errors.length >= 1) {
            this.set('clientErrors', errors);
            return errors;
        }
    },

    getServerErrors: function(serverResponse) {
        var errors = [];

        this.set({
            'clientErrors': null,
            'serverErrors': null
        });

        if (serverResponse) {
            if (!serverResponse['email_valid']) {
                errors.push('Email is invalid or already in use');
            }
            if (!serverResponse['password_valid']) {
                errors.push('Passwords are invalid or do not match');
            }
            if (!serverResponse['username_valid']) {
                errors.push('User name is invalid or already in use');
            }
        }

        if (errors.length >= 1) {
            this.set('serverErrors', errors);
        }
    }
});

var ForgotFormModel = Backbone.Model.extend({
    defaults: {
        success: null,
        clientErrors: null,
        serverErrors: null,
        email: null,
        username: false,
        password: false
    },

    url: 'user/forgot',

    validate: function(attrs, options) {
        var errors = [];

        this.set({
            'clientErrors': null,
            'serverErrors': null
        });

        if (!attrs.email) {
            errors.push('Please enter an email address');
        }

        if (!attrs.username && !attrs.password) {
            errors.push('Please check user name and/or password');
        }

        if (errors.length >= 1) {
            this.set('clientErrors', errors);
            return errors;
        }
    },

    getServerErrors: function(response) {
        var errors = [];

        this.set({
            'clientErrors': null,
            'serverErrors': null
        });

        if (!response['email_valid']) {
            errors.push('Email is invalid');
        }

        if (errors.length >= 1) {
            this.set('serverErrors', errors);
        }
    }
});

module.exports = {
    UserModel: UserModel,
    LoginFormModel: LoginFormModel,
    SignUpFormModel: SignUpFormModel,
    ForgotFormModel: ForgotFormModel
};
