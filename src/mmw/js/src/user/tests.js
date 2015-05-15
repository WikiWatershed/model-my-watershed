"use strict";

var _ = require('lodash'),
    L = require('leaflet'),
    $ = require('jquery'),
    assert = require('chai').assert,
    Backbone = require('../../shim/backbone'),
    sinon = require('sinon'),
    App = require('../app'),
    views = require('./views'),
    models = require('./models');

describe('UserModalLogin', function() {
    before(function() {
        if ($('#sandbox').length === 0) {
            $('<div>', {id: 'sandbox'}).appendTo('body');
        }
    });

    beforeEach(function() {
        this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;
    });

    afterEach(function() {
        $('#sandbox').empty();
        this.server.restore();
    });

    after(function() {
        $('#sandbox').remove();
    });

    describe('LoginView', function() {
        it('creates an error when there is no username', function() {
            var loginView = new views.LoginModalView({
                el: '#sandbox',
                model: new models.LoginFormModel({})
            }).render();

            loginView.$el.find('#id_username').val('');
            loginView.$el.find('#id_password').val('password');
            loginView.$el.find('#sign-in').click();
            var validationError = loginView.$el.find('ul li').first().text();
            assert.equal(validationError, 'Please enter a username', 'Could not find missing username message.');
        });
        it('creates an error when there is no password', function() {
            var loginView = new views.LoginModalView({
                el: '#sandbox',
                model: new models.LoginFormModel({})
            }).render();

            loginView.$el.find('#id_username').val('bob');
            loginView.$el.find('#id_password').val('');
            loginView.$el.find('#sign-in').click();
            var validationError = loginView.$el.find('ul li').first().text();
            assert.equal(validationError, 'Please enter a password', 'Could not find missing password message.');
        });
        it('creates an error when trying to fetch a user with bad credentials', function() {
            this.server.respondWith([400, { 'Content-Type': 'application/json' }, '{"result": "error"}']);
            var loginView = new views.LoginModalView({
                el: '#sandbox',
                model: new models.LoginFormModel({})
            }).render();

            loginView.$el.find('#id_username').val('bad');
            loginView.$el.find('#id_password').val('apple');
            loginView.$el.find('#sign-in').click();
            var validationError = loginView.$el.find('span.error').text();
            assert.equal(validationError, 'Incorrect username or password', 'Could not find failed login message.');
        });
        it('logs the user in when there is a valid response', function() {
            this.server.respondWith([200, { 'Content-Type': 'application/json' }, '{"result": "success", "username": "bob" }']);
            var loginView = new views.LoginModalView({
                el: '#sandbox',
                model: new models.LoginFormModel({})
            }).render();
            loginView.$el.find('#id_username').val('bob');
            loginView.$el.find('#id_password').val('bob');
            loginView.$el.find('#sign-in').click();
            assert.notOk(loginView.$el.is(':visible'), 'Modal should no longer be visible.');
            assert.equal(App.user.get('username'), 'bob', 'Could not get username.');
        });
    });
});
