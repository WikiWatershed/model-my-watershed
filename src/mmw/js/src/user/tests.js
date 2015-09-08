"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    assert = require('chai').assert,
    sinon = require('sinon'),
    App = require('../app'),
    views = require('./views'),
    models = require('./models'),
    coreViews = require('../core/views'),
    testUtils = require('../core/testUtils');

var ENTER_KEYCODE = 13,
    sandboxId = 'sandbox',
    sandboxSelector = '#' + sandboxId;

describe('User', function() {
    before(function() {
    });

    beforeEach(function() {
        $(sandboxSelector).remove();
        $('<div>', {id: sandboxId}).appendTo('body');

        this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;
    });

    afterEach(function() {
        this.server.restore();
        testUtils.resetApp(App);
    });

    after(function() {
        $(sandboxSelector).remove();
    });

    describe('LoginView', function() {
        it('creates an error when there is no username', function() {
            var loginView = new views.LoginModalView({
                el: sandboxSelector,
                model: new models.LoginFormModel({}),
                app: App
            }).render();

            loginView.$el.find('#username').val('');
            loginView.$el.find('#password').val('password');
            loginView.$el.find('#primary-button').click();
            var validationError = loginView.$el.find('ul li').first().text();
            assert.equal(validationError, 'Please enter a username', 'Could not find missing username message.');
        });

        it('creates an error when there is no password', function() {
            var loginView = new views.LoginModalView({
                el: sandboxSelector,
                model: new models.LoginFormModel({}),
                app: App
            }).render();

            loginView.$el.find('#username').val('bob');
            loginView.$el.find('#password').val('');
            loginView.$el.find('#primary-button').click();
            var validationError = loginView.$el.find('ul li').first().text();
            assert.equal(validationError, 'Please enter a password', 'Could not find missing password message.');
        });

        it('creates an error when trying to fetch a user with bad credentials', function() {
            this.server.respondWith([400, { 'Content-Type': 'application/json' }, '{"errors": ["Invalid username or password"], "guest": true}']);
            var loginView = new views.LoginModalView({
                el: sandboxSelector,
                model: new models.LoginFormModel({}),
                app: App
            }).render();

            loginView.$el.find('#username').val('bad');
            loginView.$el.find('#password').val('apple');
            loginView.$el.find('#primary-button').click();
            var validationError = loginView.$el.find('ul li').first().text();

            assert.equal(validationError, 'Invalid username or password', 'Could not find failed login message.');
        });

        it ('creates an error when failing to communicate with server', function() {
            this.server.respondWith([500, {}, '']);
            var loginView = new views.LoginModalView({
                el: sandboxSelector,
                model: new models.LoginFormModel({}),
                app: App
            }).render();

            loginView.$el.find('#username').val('bad');
            loginView.$el.find('#password').val('apple');
            loginView.$el.find('#primary-button').click();
            var validationError = loginView.$el.find('ul li').first().text();

            assert.equal(validationError, 'Server communication error', 'Could not find failed server message.');
        });

        it('logs the user in when there is a valid response', function() {
            var username = 'bob';
            this.server.respondWith([200, { 'Content-Type': 'application/json' }, '{"result": "success", "username": "bob" }']);
            var loginView = new views.LoginModalView({
                el: sandboxSelector,
                model: new models.LoginFormModel({}),
                app: App
            }).render();
            // Activate modal and make sure it is visible.
            loginView.$el.modal('show');
            assert.ok(loginView.$el.is(':visible'), 'Modal is not visible');

            loginView.$el.find('#username').val(username);
            loginView.$el.find('#password').val(username);
            loginView.$el.find('#primary-button').click();

            assert.notOk(loginView.$el.is(':visible'), 'Modal should no longer be visible.');
            assert.equal(App.user.get('username'), username, 'Could not get username.');
        });

        it('activates the form submission when enter is pressed', function() {
            var username = 'john';
            this.server.respondWith([200, { 'Content-Type': 'application/json' }, '{"result": "success", "username": "' + username + '" }']);
            var loginView = new views.LoginModalView({
                el: sandboxSelector,
                model: new models.LoginFormModel({}),
                app: App
            }).render();
            var header = new coreViews.HeaderView({
                model: App.user,
                appState: App.state
            }).render();

            // Activate modal and make sure it is visible.
            loginView.$el.modal('show');
            assert.ok(loginView.$el.is(':visible'), 'Modal is not visible');

            loginView.$el.find('#username').val(username);
            loginView.$el.find('#password').val(username);
            var e = $.Event('keyup');
            e.keyCode = ENTER_KEYCODE;
            loginView.$el.find('#password').trigger(e);

            assert.notOk(loginView.$el.is(':visible'), 'Modal should no longer be visible.');

            // Make sure the header changes to show the username.
            var match = _.find(header.$el.find('.navigation ul.main li a.dropdown-toggle'), function(item) {
               return $(item).text().trim() === username;
            });
            assert.ok(match, 'Username did not show up in the header');

            $('#header-container').remove();
        });

        it('should not dismiss the modal form if a non-enter key is pressed', function() {
            var loginView = new views.LoginModalView({
                el: sandboxSelector,
                model: new models.LoginFormModel({}),
                app: App
            }).render();

            // Activate modal and make sure it is visible.
            loginView.$el.modal('show');
            assert.ok(loginView.$el.is(':visible'), 'Modal is not visible');

            var e = $.Event('keyup');
            e.keyCode = 22;
            loginView.$el.find('#password').trigger(e);

            assert.ok(loginView.$el.is(':visible'), 'Modal still be visible.');
        });
    });
});
