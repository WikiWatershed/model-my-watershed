"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    router = require('../router').router,
    models = require('./models'),
    loginModalTmpl = require('./templates/loginModal.html'),
    signUpModalTmpl = require('./templates/signUpModal.html'),
    forgotModalTmpl = require('./templates/forgotModal.html');

var ENTER_KEYCODE = 13;

var ModalBaseView = Marionette.ItemView.extend({
    className: 'modal modal-large fade',

    ui: {
        primary_button: '#primary-button',
        dismiss_button: '#dismiss-button'
    },

    events: {
        'keyup input': 'handleKeyUpEvent',
        'click @ui.primary_button': 'validate',
        'click @ui.dismiss_button': 'dismissAction'
    },

    modalViewOptions: ['app'],

    // Combine base and child `ui` and `event` hashes,
    // import `app` if specified,
    // initialize common routines and handlers.
    initialize: function(child, options) {
        child.ui = _.extend(child.ui, this.ui);
        child.events = _.extend(child.events, this.events);

        child.mergeOptions(options, child.modalViewOptions);

        child.listenTo(child.model, 'change', child.render);
        child.$el.on('hidden.bs.modal', _.bind(this.onModalHidden, child));
    },

    onModalHidden: function() {
        this.destroy();
    },

    onRender: function() {
        this.$el.modal('show');
    },

    handleKeyUpEvent: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            this.validate();
        }
    },

    // Primary Action might be "log in" or "sign up" or "reset password".
    // By default this serializes all form data and POSTs to child's `url`.
    // Override if other behavior is required.
    primaryAction: function() {
        var formData = this.$el.find('form').serialize();
        this.model
            .fetch({
                method: 'POST',
                data: formData
            })
            .done(_.bind(this.handleServerSuccess, this))
            .fail(_.bind(this.handleServerFailure, this));
    },

    handleServerSuccess: function() {
        this.model.set({
            'success': true,
            'client_errors': null,
            'server_errors': null
        });
    },

    // Default failure handler, will display any `errors` received from server.
    handleServerFailure: function(response) {
        var server_errors = ["Server communication error"];
        if (response.responseJSON.errors) {
            server_errors = response.responseJSON.errors;
        }
        this.model.set({
            'success': false,
            'client_errors': null,
            'server_errors': server_errors
        });
    },

    // Dismiss Action can be "cancel" or "continue as guest". Noop by default.
    // Override if other behavior is required.
    dismissAction: function() { },

    // Performs Primary Action if model is in valid state.
    // `setFields` must be defined on child.
    validate: function() {
        this.setFields();
        if (this.model.isValid()) {
            this.primaryAction();
        }
    }
});

var LoginModalView = ModalBaseView.extend({
    template: loginModalTmpl,

    ui: {
        username: '#username',
        password: '#password',
        signUp:   '.sign-up',
        forgot:   '.forgot'
    },

    events: {
        'click @ui.signUp': 'signUp',
        'click @ui.forgot': 'forgot'
    },

    initialize: function(options) {
        ModalBaseView.prototype.initialize(this, options);
    },

    setFields: function() {
        this.model.set({
            username: $(this.ui.username.selector).val(),
            password: $(this.ui.password.selector).val()
        }, { silent: true });
    },

    // Login
    primaryAction: function() {
        this.app.user
            .login(this.model.attributes)
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleFailure, this));
    },

    handleSuccess: function() {
        this.$el.modal('hide');
        this.app.user.set('guest', false);
    },

    handleFailure: function(response) {
        this.handleServerFailure(response);
        this.app.user.set('guest', true);
    },

    // Continue as Guest
    dismissAction: function() {
        this.app.user.set('guest', true);
    },

    // Sign Up
    signUp: function() {
        this.$el.modal('hide');
        this.$el.on('hidden.bs.modal', function() {
            router.navigate('/sign-up', { trigger: true });
        });
    },

    // Forgot
    forgot: function() {
        this.$el.modal('hide');
        this.$el.on('hidden.bs.modal', function() {
            new ForgotModalView({
                model: new models.ForgotFormModel({})
            }).render();
        });
    }
});

var SignUpModalView = ModalBaseView.extend({
    template: signUpModalTmpl,

    ui: {
        'username': '#username',
        'email': '#email',
        'password1': '#password1',
        'password2': '#password2',
        'agreed': '#agreed'
    },

    initialize: function(options) {
        ModalBaseView.prototype.initialize(this, options);
        this.$el.on('hidden.bs.modal', function() {
            router.navigate('', { trigger: true });
        });
    },

    setFields: function() {
        this.model.set({
            username: $(this.ui.username.selector).val(),
            email: $(this.ui.email.selector).val(),
            password1: $(this.ui.password1.selector).val(),
            password2: $(this.ui.password2.selector).val(),
            agreed: $(this.ui.agreed.selector).prop('checked')
        }, { silent: true });
    }
});

var ForgotModalView = ModalBaseView.extend({
    template: forgotModalTmpl,

    ui: {
        'email': '#email',
        'username': '#username',
        'password': '#password'
    },

    initialize: function(options) {
        ModalBaseView.prototype.initialize(this, options);
    },

    setFields: function() {
        this.model.set({
            email: $(this.ui.email.selector).val(),
            username: $(this.ui.username.selector).prop('checked'),
            password: $(this.ui.password.selector).prop('checked')
        }, { silent: true });
    }
});

module.exports = {
    LoginModalView: LoginModalView,
    SignUpModalView: SignUpModalView,
    ForgotModalView: ForgotModalView
};
