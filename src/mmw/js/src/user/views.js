"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    coreUtils = require('../core/utils.js'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    router = require('../router').router,
    settings = require('../core/settings'),
    models = require('./models'),
    loginModalTmpl = require('./templates/loginModal.html'),
    userProfileModalTmpl = require('./templates/userProfileModal.html'),
    signUpModalTmpl = require('./templates/signUpModal.html'),
    resendModalTmpl = require('./templates/resendModal.html'),
    forgotModalTmpl = require('./templates/forgotModal.html'),
    changePasswordModalTmpl =
        require('./templates/changePasswordModal.html'),
    itsiSignUpModalTmpl = require('./templates/itsiSignUpModal.html');

var ENTER_KEYCODE = 13;
var ESC_KEYCODE = 27;

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

    templateHelpers: {
        'title': settings.get('title'),
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
        if (e.keyCode === ESC_KEYCODE && this.escapeHandler) {
            e.preventDefault();
            return this.escapeHandler(e);
        }
    },

    getDisabledState: function($el) {
        var model = this.model;

        if (coreUtils.modalButtonDisabled(model, $el)) {
            return true;
        } else {
            coreUtils.modalButtonToggle(model, $el, false);
            return false;
        }
    },

    // Primary Action might be "log in" or "sign up" or "reset password".
    // By default this serializes all form data and POSTs to child's `url`.
    // Override if other behavior is required.
    primaryAction: function() {
        if (this.getDisabledState(this.ui.primary_button) === true) {
            return;
        }

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
        this.ui.username.trigger('focus');
    },

    onValidationError: function() {
        this.ui.username.trigger('focus');
    },

    setFields: function() {
        this.model.set({
            username: $(this.ui.username.selector).val(),
            password: $(this.ui.password.selector).val()
        }, { silent: true });
    },

    // Login
    primaryAction: function() {
        if (this.getDisabledState(this.ui.primary_button) === true) {
            return;
        }

        this.app.user
            .login(this.model.attributes)
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleFailure, this));
    },

    handleSuccess: function(response) {
        this.$el.modal('hide');
        this.app.user.set('guest', false);
        this.model.onSuccess(response);
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
        if (this.getDisabledState(this.ui.itsiLogin) === true) {
            return;
        }

        var loginURL = '/user/itsi/login?next=/' + Backbone.history.getFragment();
        if (window.clientSettings.itsi_embed) {
            loginURL += '&itsi_embed=true';
        }
        window.location.href = loginURL;
    }
});

var UserProfileModalView = ModalBaseView.extend({
    template: userProfileModalTmpl,

    ui: _.defaults({
        firstName: '#first_name',
        lastName: '#last_name',
        organization: '#organization',
        userType: '#user_type',
        country: '#country',
        postalCode: '#postal_code',
        submitProfile: '.submit-profile',
        skip: '.skip'
    }, ModalBaseView.prototype.ui),

    events: _.defaults({
        'click @ui.submitProfile': 'submitProfile',
        'click @ui.later': 'later',
        'keydown button': 'enterTogglesDropdown'
    }, ModalBaseView.prototype.events),

    onModalShown: function() {
        var self = this,
            escKeyPressClosesDropdown = function (e) {
                var $element = $(e.target).closest('.bootstrap-select');
                if (e.keyCode === 27) {
                    // Clear the textbox, hide close the dropdown, return focus to the now closed dropdown
                    e.preventDefault();
                    $(e.target).val('');
                    $element.find('.selectpicker').selectpicker('toggle');
                    $element.find('button').trigger('focus');
                    return false;
                }
            },
            inputs = [
                this.ui.country.parent().find('input'),
                this.ui.userType.parent().find('input')
            ];
        _.forEach(inputs, function($input) {
            $input.on('keypress', escKeyPressClosesDropdown);
            $input.on('focus', function() { self.escapeHandler = escKeyPressClosesDropdown;});
            $input.on('blur', function() { self.escapeHandler = undefined; });
        });

        this.ui.firstName.trigger('focus');
    },

    handleSuccess: function(response) {
        this.app.user.set({
            'show_profile_popover': response.was_skipped,
            'profile_was_skipped': response.was_skipped,
            'profile_is_complete': response.is_complete
        });
        this.handleServerSuccess(response);
        this.$el.modal('hide');
    },

    handleFailure: function(response) {
        this.handleServerFailure(response);
    },

    setFields: function () {
        this.model.set({
            first_name: this.ui.firstName.val(),
            last_name: this.ui.lastName.val(),
            organization: this.ui.organization.val(),
            user_type: this.ui.userType.val(),
            country: this.ui.country.val(),
            postal_code: this.ui.postalCode.val()
        }, { silent: true });
    },

    primaryAction: function() {
        this.model
            .fetch({
                method: 'POST',
                data: this.model.attributes })
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleFailure, this));
    },

    dismissAction: function() {
        this.model
            .fetch({
                method: 'POST',
                data: { was_skipped: true }})
            .done(_.bind(this.handleSuccess, this))
            .fail(_.bind(this.handleFailure, this));
    },

    enterTogglesDropdown: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            e.preventDefault();
            // In testing the form is validated and submitted unless this call to 'toggle' is delayed
            setTimeout(function () { $(e.target).siblings('.selectpicker').selectpicker('toggle'); }, 100);
            return false;
        }
        return true;
    }
});

var SignUpModalView = ModalBaseView.extend({
    template: signUpModalTmpl,

    ui: _.defaults({
        'username': '#username',
        'email': '#email',
        'password1': '#password1',
        'password2': '#password2',
        'login': '.login',
        'resend': '.resend',
    }, ModalBaseView.prototype.ui),

    events: _.defaults({
        'click @ui.login': 'login',
        'click @ui.resend': 'resend',
    }, ModalBaseView.prototype.events),

    onModalShown: function() {
        this.ui.username.trigger('focus');
    },

    onModalHidden: function() {
        ModalBaseView.prototype.onModalHidden.apply(this, arguments);
        if (Backbone.history.getFragment() === 'sign-up') {
            router.navigate('', { trigger: true });
        }
    },

    onValidationError: function() {
        this.ui.username.trigger('focus');
    },

    setFields: function() {
        this.model.set({
            username: $(this.ui.username.selector).val(),
            email: $(this.ui.email.selector).val(),
            password1: $(this.ui.password1.selector).val(),
            password2: $(this.ui.password2.selector).val(),
        }, { silent: true });
    },

    dismissAction: function() {
        this.app.showLoginModal();
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
    },

    resend: function() {
        this.$el.modal('hide');
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            new ResendModalView({
                app: self.app,
                model: new models.ResendFormModel()
            }).render();
        });
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
        this.ui.email.trigger('focus');
    },

    onValidationError: function() {
        this.ui.email.trigger('focus');
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
        'signUp': '.sign-up'
    }, ModalBaseView.prototype.ui),

    events: _.defaults({
        'click @ui.signUp': 'signUp'
    }, ModalBaseView.prototype.events),

    onModalShown: function() {
        this.ui.email.trigger('focus');
    },

    onValidationError: function() {
        this.ui.email.trigger('focus');
    },

    setFields: function() {
        this.model.set({
            email: $(this.ui.email.selector).val()
        }, { silent: true });
    },

    signUp: function() {
        this.$el.modal('hide');
        var self = this;
        this.$el.on('hidden.bs.modal', function() {
            new SignUpModalView({
                app: self.app,
                model: new models.SignUpFormModel({})
            }).render();
        });
    }
});

var ItsiSignUpModalView = ModalBaseView.extend({
    template: itsiSignUpModalTmpl,

    ui: _.defaults({}, ModalBaseView.prototype.ui),

    onModalHidden: function() {
        ModalBaseView.prototype.onModalHidden.apply(this, arguments);

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

var ChangePasswordModalView = ModalBaseView.extend({
    template: changePasswordModalTmpl,

    ui: _.defaults({
        'oldPassword': '#old_password',
        'password1': '#new_password1',
        'password2': '#new_password2'
    }, ModalBaseView.prototype.ui),

    onModalShown: function() {
        this.ui.oldPassword.trigger('focus');
    },

    onValidationError: function() {
        this.ui.oldPassword.trigger('focus');
    },

    setFields: function() {
        this.model.set({
            old_password: $(this.ui.oldPassword.selector).val(),
            new_password1: $(this.ui.password1.selector).val(),
            new_password2: $(this.ui.password2.selector).val(),
        }, { silent: true });
    }
});

module.exports = {
    LoginModalView: LoginModalView,
    UserProfileModalView: UserProfileModalView,
    SignUpModalView: SignUpModalView,
    ResendModalView: ResendModalView,
    ForgotModalView: ForgotModalView,
    ChangePasswordModalView: ChangePasswordModalView,
    ItsiSignUpModalView: ItsiSignUpModalView
};
