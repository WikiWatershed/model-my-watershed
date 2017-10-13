"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    models = require('./models'),
    containerTmpl = require('./templates/container.html'),
    profileTmpl = require('./templates/profile.html'),
    accountTmpl = require('./templates/account.html');

var ProfileView = Marionette.ItemView.extend({
    template: profileTmpl
});

var AccountView = Marionette.ItemView.extend({
    template: accountTmpl
});

var AccountContainerView = Marionette.LayoutView.extend({
    // model AccountContainerModel

    template: containerTmpl,

    ui: {
        profile: '[data-action="viewprofile"]',
        account: '[data-action="viewaccount"]'
    },

    events: {
        'click @ui.profile': 'viewProfile',
        'click @ui.account': 'viewAccount'
    },

    modelEvents: {
        'change:active_page': 'render'
    },

    regions: {
        infoContainer: '.account-page-container'
    },

    showActivePage: function() {
        var activePage = this.model.get('active_page');

        switch(activePage) {
            case models.PROFILE:
                this.infoContainer.show(new ProfileView());
                break;
            case models.ACCOUNT:
                this.infoContainer.show(new AccountView());
                break;
            default:
                console.error("Account page, ", activePage,
                              ", is not supported.");
        }
    },

    onRender: function() {
        this.showActivePage();
    },

    viewProfile: function() {
        this.model.set('active_page', models.PROFILE);
    },

    viewAccount: function() {
        this.model.set('active_page', models.ACCOUNT);
    }
});

module.exports = {
    AccountContainerView: AccountContainerView
};
