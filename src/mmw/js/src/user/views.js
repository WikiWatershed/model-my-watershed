"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    loginModalTmpl = require('./templates/loginModal.ejs');

var ENTER_KEYCODE = 13;

var LoginModalView = Marionette.ItemView.extend({
    template: loginModalTmpl,

    ui: {
        'signIn': '#sign-in',
        'continueAsGuest': '#continue-as-guest',
        // The id names come from the default Django login form
        'username': '#id_username',
        'password': '#id_password'
    },

    events: {
        'click @ui.signIn': 'validate',
        'click @ui.continueAsGuest': 'continueAsGuest',
        'keyup': 'handleKeyUpEvent'
    },

    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
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

        if (errors) {
            return;
        } else {
            this.signIn();
        }
    },

    signIn: function() {
        var formData = this.$el.find('form').serialize();
        App.user.fetch({
            method: 'POST',
            data: formData
        })
        .done(_.bind(this.handleSignInSuccess, this))
        .fail(_.bind(this.handleSignInFail, this));
    },

    continueAsGuest: function() {
        App.user.set('guest', true);
    },

    handleSignInSuccess: function() {
        this.$el.modal('hide');
        App.user.set('guest', false);
    },

    handleSignInFail: function() {
        this.model.set('signInError', true);
        App.user.set('guest', true);
    }
});

module.exports = {
    LoginModalView: LoginModalView
};
