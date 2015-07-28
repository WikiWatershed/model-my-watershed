"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    router = require('../router').router,
    models = require('./models'),
    loginModalTmpl = require('./templates/loginModal.html'),
    signUpModalTmpl = require('./templates/signUpModal.html'),
    resendModalTmpl = require('./templates/resendModal.html'),
    forgotModalTmpl = require('./templates/forgotModal.html'),
    itsiSignUpModalTmpl = require('./templates/itsiSignUpModal.html');

var ENTER_KEYCODE = 13;

var ModalBaseView = Marionette.ItemView.extend({
    className: 'modal modal-large fade',

    ui: {
        primary_button: '#primary-button',
        dismiss_button: '#dismiss-button'
    },

    events: {
        'keyup input': 'handleKeyUpEvent',
        'keydown input': 'handleKeyDownEvent',
        'click @ui.primary_button': 'validate',
        'click @ui.dismiss_button': 'dismissAction'
    },

    // Initialize common routines and handlers.
    initialize: function(options) {
        this.mergeOptions(options, ['app']);

        this.listenTo(this.model, 'change', this.render);
        this.$el.on('shown.bs.modal', _.bind(this.onModalShown, this));
        this.$el.on('hidden.bs.modal', _.bind(this.onModalHidden, this));
    },

    onModalShown: function() {
        // Not implemented.
    },

    onModalHidden: function() {
        this.destroy();
    },

    // Invoked after ENTER key is pressed if the model is invalid.
    onValidationError: function() {
        // Not implemented.
    },

    onRender: function() {
        this.$el.modal('show');
    },

    handleKeyUpEvent: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            e.preventDefault();
            this.validate();
        }
    },

    handleKeyDownEvent: function(e) {
        // Needed to prevent form from being posted when pressing enter.
        if (e.keyCode === ENTER_KEYCODE) {
            e.preventDefault();
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
        if (response && response.responseJSON && response.responseJSON.errors) {
            server_errors = response.responseJSON.errors;
        }
        this.model.set({
            'success': false,
            'client_errors': null,
            'server_errors': server_errors
        });
        this.onValidationError();
    },

    // Dismiss Action can be "cancel" or "continue as guest". Noop by default.
    // Override if other behavior is required.
    dismissAction: function() {
        // Not implemented.
    },

    setFields: function() {
        throw 'Not implemented';
    },

    // Performs Primary Action if model is in valid state.
    validate: function() {
        this.setFields();
        if (this.model.isValid()) {
            this.primaryAction();
        } else {
            this.onValidationError();
        }
    }
});

var LoginModalView = ModalBaseView.extend({
    template: loginModalTmpl,

    ui: _.defaults({
        username: '#username',
        password: '#password',
        signUp: '.sign-up',
        resend: '.resend',
        forgot: '.forgot',
        itsiLogin: '.itsi-login'
    }, ModalBaseView.prototype.ui),

    events: _.defaults({
        'click @ui.signUp': 'signUp',
        'click @ui.resend': 'resend',
        'click @ui.forgot': 'forgot',
        'click @ui.itsiLogin': 'itsiLogin'
    }, ModalBaseView.prototype.events),

    onModalShown: function() {
        this.ui.username.focus();
    },

    onValidationError: function() {
        this.ui.username.focus();
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
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            new SignUpModalView({
                app: self.app,
                model: new models.SignUpFormModel({})
            }).render();
        });
    },

    // Resend activation email
    resend: function() {
        this.$el.modal('hide');
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            new ResendModalView({
                app: self.app,
                model: new models.ResendFormModel({})
            }).render();
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
    },

    // Login with ITSI
    itsiLogin: function() {
        var loginURL = '/user/itsi/login?next=/' + Backbone.history.getFragment();
        window.location.href = loginURL;
    }
});

var SignUpModalView = ModalBaseView.extend({
    template: signUpModalTmpl,

    ui: _.defaults({
        'username': '#username',
        'email': '#email',
        'password1': '#password1',
        'password2': '#password2',
        'agreed': '#agreed'
    }, ModalBaseView.prototype.ui),

    onModalShown: function() {
        this.ui.username.focus();
    },

    onModalHidden: function() {
        ModalBaseView.prototype.onModalHidden.apply(this, arguments);
        if (Backbone.history.getFragment() === 'sign-up') {
            router.navigate('', { trigger: true });
        }
    },

    onValidationError: function() {
        this.ui.username.focus();
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

    dismissAction: function() {
        this.app.showLoginModal();
    }
});

var ResendModalView = ModalBaseView.extend({
    template: resendModalTmpl,

    ui: _.defaults({
        'email': '#email',
        'login': '#login'
    }, LoginModalView.prototype.ui),

    events: _.defaults({
        'click @ui.login': 'login'
    }, ModalBaseView.prototype.events),

    onModalShown: function() {
        this.ui.email.focus();
    },

    onValidationError: function() {
        this.ui.email.focus();
    },

    setFields: function() {
        this.model.set({
            email: $(this.ui.email.selector).val()
        }, { silent: true });
    },

    login: function() {
        this.$el.modal('hide');
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            new LoginModalView({
                app: self.app,
                model: new models.LoginFormModel()
            }).render();
        });
    }
});

var ForgotModalView = ModalBaseView.extend({
    template: forgotModalTmpl,

    ui: _.defaults({
        'email': '#email',
        'username': '#username',
        'password': '#password'
    }, ModalBaseView.prototype.ui),

    onModalShown: function() {
        this.ui.email.focus();
    },

    onValidationError: function() {
        this.ui.email.focus();
    },

    setFields: function() {
        this.model.set({
            email: $(this.ui.email.selector).val(),
            username: $(this.ui.username.selector).prop('checked'),
            password: $(this.ui.password.selector).prop('checked')
        }, { silent: true });
    }
});

var ItsiSignUpModalView = ModalBaseView.extend({
    template: itsiSignUpModalTmpl,

    ui: _.defaults({
        'username': '#username',
        'first_name': '#first_name',
        'last_name': '#last_name',
        'agreed': '#agreed'
    }, ModalBaseView.prototype.ui),

    onModalShown: function() {
        this.ui.username.focus();
    },

    onValidationError: function() {
        this.ui.username.focus();
    },

    setFields: function() {
        this.model.set({
            username: $(this.ui.username.selector).val(),
            first_name: $(this.ui.first_name.selector).val(),
            last_name: $(this.ui.last_name.selector).val(),
            agreed: $(this.ui.agreed.selector).prop('checked')
        }, { silent: true });
    },

    // Override to provide custom success handler
    primaryAction: function() {
        var formData = this.$el.find('form').serialize();
        this.model
            .fetch({
                method: 'POST',
                data: formData
            })
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleServerFailure, this));
    },

    // User account has been created and user has been logged in.
    // Dismiss modal and update App user state.
    handleSuccess: function(response) {
        this.$el.modal('hide');
        this.app.user.set({
            'username': response.username,
            'guest': false
        });

        var next = this.model.get('next');
        if (next !== '/') {
            // Must remove leading slash, add trailing slash
            // otherwise Backbone.router.navigate does not function properly
            if (next[0] === "/") {
                next = next.substring(1);
            }
            if (next[next.length - 1] !== "/") {
                next = next + "/";
            }
        }

        router.navigate(next, { trigger: true });
    }
});

module.exports = {
    LoginModalView: LoginModalView,
    SignUpModalView: SignUpModalView,
    ResendModalView: ResendModalView,
    ForgotModalView: ForgotModalView,
    ItsiSignUpModalView: ItsiSignUpModalView
};
