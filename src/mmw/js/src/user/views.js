"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    models = require('./models'),
    loginModalTmpl = require('./templates/loginModal.html'),
    signUpModalTmpl = require('./templates/signUpModal.html'),
    forgotModalTmpl = require('./templates/forgotModal.html');

var ENTER_KEYCODE = 13;

var LoginModalView = Marionette.ItemView.extend({
    template: loginModalTmpl,
    className: 'modal modal-large fade',
    ui: {
        'loginButton': '#login-button',
        'continueAsGuest': '#continue-as-guest',
        // The id names come from the default Django login form
        'username': '#id_username',
        'password': '#id_password',
        'signUp': '.sign-up',
        'forgot': '.forgot',
        'loginModal': '#login-modal'
    },

    events: {
        'click @ui.loginButton': 'validate',
        'keyup @ui.loginModal': 'handleKeyUpEvent',
        'click @ui.continueAsGuest': 'continueAsGuest',
        'click @ui.signUp': 'signUp',
        'click @ui.forgot': 'forgot'
    },

    initialize: function(options) {
        this.app = options.app;
        this.listenTo(this.model, 'change', this.render);
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            self.destroy();
        });
    },

    onRender: function() {
        this.$el.modal('show');
    },

    handleKeyUpEvent: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            this.validate();
        }
    },

    setFields: function() {
        this.model.set({
            username: $(this.ui.username.selector).val(),
            password: $(this.ui.password.selector).val()
        }, { silent: true });
    },

    validate: function() {
        this.setFields();

        var errors = this.model.validate(this.model.attributes);

        if (!errors) {
            this.login();
        }
    },

    login: function() {
        this.app.user
            .login({
                username: this.model.get('username'),
                password: this.model.get('password')
            })
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleFail, this));
    },

    signUp: function() {
        this.$el.modal('hide');
        this.$el.on('hidden.bs.modal', function() {
            new SignUpModalView({
                model: new models.SignUpFormModel({})
            }).render();
        });
    },

    forgot: function() {
        this.$el.modal('hide');
        this.$el.on('hidden.bs.modal', function() {
            new ForgotModalView({
                model: new models.ForgotFormModel({})
            }).render();
        });
    },

    continueAsGuest: function() {
        this.app.user.set('guest', true);
    },

    handleSuccess: function() {
        this.$el.modal('hide');
        this.app.user.set('guest', false);
    },

    handleFail: function() {
        this.model.set('loginError', true);
        this.app.user.set('guest', true);
    }
});


var SignUpModalView = Marionette.ItemView.extend({
    template: signUpModalTmpl,

    className: 'modal modal-large fade',

    ui: {
        'signUpButton': '#sign-up-button',
        // The id names come from the default Django login form
        'username': '#username',
        'email': '#email',
        'password1': '#password1',
        'password2': '#password2',
        'agreed': '#agreed',
        'signUpModal': '#sign-up-modal'
    },

    events: {
        'click @ui.signUpButton': 'validate',
        'keyup @ui.signUpModal': 'handleKeyUpEvent'
    },

    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            self.destroy();
        });
    },

    onRender: function() {
        this.$el.modal('show');
    },

    handleKeyUpEvent: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            this.validate();
        }
    },

    setFields: function() {
        this.model.set({
            username: $(this.ui.username.selector).val(),
            email: $(this.ui.email.selector).val(),
            password1: $(this.ui.password1.selector).val(),
            password2: $(this.ui.password2.selector).val(),
            agreed: $(this.ui.agreed.selector).prop('checked')
        }, { silent: true });
    },

    validate: function() {
        this.setFields();

        var errors = this.model.validate(this.model.attributes);
        if (!errors) {
            this.signUp();
        }
    },

    signUp: function() {
        var formData = this.$el.find('form').serialize();
        this.model
            .fetch({
                method: 'POST',
                data: formData
            })
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleFail, this));
    },

    handleSuccess: function() {
        this.model.set({
            'success': true,
            'clientErrors': null,
            'serverErrors': null
        });
    },

    handleFail: function(response) {
        this.model.getServerErrors(response.responseJSON);
    }
});

var ForgotModalView = Marionette.ItemView.extend({
    template: forgotModalTmpl,

    className: 'modal modal-large fade',

    ui: {
        'forgotModal': '#forgot-modal',
        'retrieveButton': '#retrieve-button',
        'email': '#email',
        'username': '#username',
        'password': '#password',
        'form': 'form'
    },

    events: {
        'click @ui.retrieveButton': 'validate',
        'keyup @ui.forgotModal': 'handleKeyUpEvent',
        'submit @ui.form': 'cancelFormSubmit'
    },

    onRender: function() {
        this.$el.modal('show');
    },

    // Used to prevent the form from being submitted by the default mechanism
    // when hitting enter.
    cancelFormSubmit: function(e) {
        e.preventDefault();
    },

    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            self.destroy();
        });
    },

    handleKeyUpEvent: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            this.validate();
        }
    },

    setFields: function() {
        this.model.set({
            email: $(this.ui.email.selector).val(),
            username: $(this.ui.username.selector).prop('checked'),
            password: $(this.ui.password.selector).prop('checked')
        }, { silent: true });
    },

    validate: function() {
        this.setFields();

        var errors = this.model.validate(this.model.attributes);
        if (!errors) {
            this.attemptReset();
        }
    },

    attemptReset: function() {
        var formData = this.$el.find('form').serialize();
        this.model
            .fetch({
                method: 'POST',
                data: formData
            })
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleFail, this));
    },

    handleSuccess: function() {
        this.model.set({
            'success': true,
            'clientErrors': null,
            'serverErrors': null
        });
    },

    handleFail: function(response) {
        this.model.getServerErrors(response.responseJSON);
    }
});

module.exports = {
    LoginModalView: LoginModalView,
    SignUpModalView: SignUpModalView,
    ForgotModalView: ForgotModalView
};
