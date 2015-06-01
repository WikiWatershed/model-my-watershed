"use strict";

var _ = require('lodash'),
    L = require('leaflet'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Backbone = require('../../shim/backbone'),
    sinon = require('sinon'),
    App = require('../app'),
    views = require('./views'),
    models = require('./models'),
    coreViews = require('../core/views');

var ENTER_KEYCODE = 13;


describe('UserModalLogin', function() {
    before(function() {
    });

    beforeEach(function() {
        $('#sandbox').remove();
        $('<div>', {id: 'sandbox'}).appendTo('body');

        this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;
    });

    afterEach(function() {
        this.server.restore();
    });

    after(function() {
        $('#sandbox').remove();
    });

    describe('LoginView', function() {
        it('creates an error when there is no username', function() {
            var loginView = new views.LoginModalView({
                model: new models.LoginFormModel({}),
                app: require('../app'),
                el: '#sandbox'
            }).render();

            loginView.$el.find('#id_username').val('');
            loginView.$el.find('#id_password').val('password');
            loginView.$el.find('#login-button').click();
            var validationError = loginView.$el.find('ul li').first().text();
            assert.equal(validationError, 'Please enter a username', 'Could not find missing username message.');
        });

        it('creates an error when there is no password', function() {
            var loginView = new views.LoginModalView({
                model: new models.LoginFormModel({}),
                app: require('../app'),
                el: '#sandbox'
            }).render();

            loginView.$el.find('#id_username').val('bob');
            loginView.$el.find('#id_password').val('');
            loginView.$el.find('#login-button').click();
            var validationError = loginView.$el.find('ul li').first().text();
            assert.equal(validationError, 'Please enter a password', 'Could not find missing password message.');
        });

        it('creates an error when trying to fetch a user with bad credentials', function() {
            this.server.respondWith([400, { 'Content-Type': 'application/json' }, '{"result": "error"}']);
            var loginView = new views.LoginModalView({
                model: new models.LoginFormModel({}),
                app: require('../app'),
                el: '#sandbox'
            }).render();

            loginView.$el.find('#id_username').val('bad');
            loginView.$el.find('#id_password').val('apple');
            loginView.$el.find('#login-button').click();
            var validationError = loginView.$el.find('span.error').first().text();

            assert.equal(validationError, 'Incorrect username or password', 'Could not find failed login message.');
        });

        it('logs the user in when there is a valid response', function() {
            var username = 'bob';
            this.server.respondWith([200, { 'Content-Type': 'application/json' }, '{"result": "success", "username": "bob" }']);
            var loginView = new views.LoginModalView({
                model: new models.LoginFormModel({}),
                app: require('../app'),
                el: '#sandbox'
            }).render();
            // Activate modal and make sure it is visible.
            loginView.$el.modal('show');
            assert.ok(loginView.$el.is(':visible'), 'Modal is not visible');

            loginView.$el.find('#id_username').val(username);
            loginView.$el.find('#id_password').val(username);
            loginView.$el.find('#login-button').click();

            assert.notOk(loginView.$el.is(':visible'), 'Modal should no longer be visible.');
            assert.equal(App.user.get('username'), username, 'Could not get username.');
        });

        it('activates the form submission when enter is pressed', function() {
            var username = 'john';
            this.server.respondWith([200, { 'Content-Type': 'application/json' }, '{"result": "success", "username": "' + username + '" }']);
            var loginView = new views.LoginModalView({
                model: new models.LoginFormModel({}),
                app: require('../app'),
                el: '#sandbox'
            }).render();

            // Logging in will cause the LoginModalView to
            // destroy() itself and its $el, which is $sandbox.
            // So we need to put the header in its own container.
            var $headerContainer = $('<div>', {id: 'header-container'});
            $('body').append($headerContainer);
            var header = new coreViews.HeaderView({
                el: '#header-container',
                model: App.user
            }).render();

            // Activate modal and make sure it is visible.
            loginView.$el.modal('show');
            assert.ok(loginView.$el.is(':visible'), 'Modal is not visible');

            loginView.$el.find('#id_username').val(username);
            loginView.$el.find('#id_password').val(username);
            var e = $.Event('keyup');
            e.keyCode = ENTER_KEYCODE;
            loginView.$el.find('#id_password').trigger(e);

            assert.notOk(loginView.$el.is(':visible'), 'Modal should no longer be visible.');

            // Make sure the header changes to show the username.
            var match = _.find($('#header-container .navigation ul.main li a.dropdown-toggle'), function(item) {
               return $(item).text().trim() === username;
            });
            assert.ok(match, 'Username did not show up in the header');

            $('#header-container').remove();
        });

        it('should not dismiss the modal form if a non-enter key is pressed', function() {
            var loginView = new views.LoginModalView({
                model: new models.LoginFormModel({}),
                app: require('../app'),
                el: '#sandbox'
            }).render();

            // Activate modal and make sure it is visible.
            loginView.$el.modal('show');
            assert.ok(loginView.$el.is(':visible'), 'Modal is not visible');

            var e = $.Event('keyup');
            e.keyCode = 22;
            loginView.$el.find('#id_password').trigger(e);

            assert.ok(loginView.$el.is(':visible'), 'Modal still be visible.');
        });
    });
});
