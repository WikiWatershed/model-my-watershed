"use strict";

var $ = require('jquery'),
    Clipboard = require('clipboard'),
    Marionette = require('../../shim/backbone.marionette'),
    _ = require('underscore'),
    moment = require('moment'),
    App = require('../app'),
    userViews = require('../user/views'),
    userModels = require('../user/models'),
    modalViews = require('../core/modals/views'),
    modalModels = require('../core/modals/models'),
    models = require('./models'),
    settings = require('../core/settings'),
    containerTmpl = require('./templates/container.html'),
    profileTmpl = require('./templates/profile.html'),
    accountTmpl = require('./templates/account.html');

var ProfileView = Marionette.ItemView.extend({
    template: profileTmpl,

    ui: {
        firstName: '#first_name',
        lastName: '#last_name',
        organization: '#organization',
        userType: '#user_type',
        country: '#country',
        postalCode: '#postal_code',
        saveChanges: '[data-action="save_changes"]'
    },

    events: {
        'click @ui.saveChanges': 'saveChanges'
    },

    modelEvents: {
        'change': 'render'
    },

    onRender: function() {
        var self = this,
            choices = settings.get('choices'),
            addOptions = function(model, field, selectedValue) {
                $.each(choices[model][field], function(index, choice) {
                    var value = choice[0];
                    var text = choice[1];
                    var selected = value === selectedValue ? ' selected ' : '';
                    self.$el.find('#' + field).append('<option ' + selected + ' value="' + value + '">' + text + '</option>');
                });
                self.$el.find('#' + field).selectpicker();
            };
        addOptions('UserProfile', 'country', self.model.get('country') || 'US');
        addOptions('UserProfile', 'user_type', self.model.get('user_type') || 'Unspecified');
        _.defer(function() { self.ui.firstName.focus(); });
    },

    saveChanges: function () {
        var model = this.model;

        model.save({
                first_name: this.ui.firstName.val(),
                last_name: this.ui.lastName.val(),
                organization: this.ui.organization.val(),
                user_type: this.ui.userType.val(),
                country: this.ui.country.val(),
                postal_code: this.ui.postalCode.val(),
                error: null,
                saving: true
            })
            .done(function() {
                App.user.set('profile_is_complete', true);
            })
            .fail(function() {
                model.set('error', 'There was a problem saving your profile.');
            })
            .always(function() {
                model.set('saving', false);
            });
    }
});

var AccountView = Marionette.ItemView.extend({
    // model ApiTokenModel
    template: accountTmpl,

    ui: {
        regenerateKey: '[data-action="regeneratekey"]',
        copyKey: '[data-action="copykey"]',
        resetPassword: '[data-action="resetpassword"]'
    },

    events: {
        'click @ui.regenerateKey': 'regenerateApiKey',
        'click @ui.resetPassword': 'resetPassword'
    },

    modelEvents: {
        'change': 'render'
    },

    onRender: function() {
        var copyKeyBtn = this.ui.copyKey,
            clipboard = new Clipboard(copyKeyBtn[0]);

        clipboard.on('success', function() {
            var beforeTitle = copyKeyBtn.data('original-title');

            copyKeyBtn.attr('title', 'Copied!')
                      .tooltip('fixTitle')
                      .tooltip('show');

            copyKeyBtn.attr('title', beforeTitle)
                      .tooltip('fixTitle');
        });

        this.activateTooltip();
    },

    templateHelpers: function() {
        var dateFormat = 'MMM D, YYYY, h:mm A',
            formattedCreatedAt = moment(this.model.get('created_at'))
                                        .format(dateFormat);
        return {
            created_at_formatted: formattedCreatedAt
        };
    },

    regenerateApiKey: function() {
        var self = this,
            titleText = 'Do you definitely want to do this?',
            detailText = 'Resetting your API key will invalidate ' +
                         'your previous one',
            modal = new modalViews.ConfirmView({
                model: new modalModels.ConfirmModel({
                    titleText: titleText,
                    className: 'modal-content-danger modal-content-padded',
                    question: detailText,
                    confirmLabel: 'Yes, reset API key',
                    cancelLabel: 'No, keep current key'
                })
            });

        modal.render();

        modal.on('confirmation', function() {
            self.model.regenerateToken();
        });
    },

    resetPassword: function() {
        var resetPasswordModal =
            new userViews.ChangePasswordModalView({
                model: new userModels.ChangePasswordFormModel()
            });

        resetPasswordModal.render();
    },

    activateTooltip: function() {
        this.ui.copyKey.tooltip({
            trigger: 'hover'
        });
    }
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

    initialize: function() {
        this.tokenModel = new models.ApiTokenModel();
        this.profileModel = new userModels.UserProfileModel(App.user.get('profile'));
    },

    showActivePage: function() {
        var activePage = this.model.get('active_page');

        switch(activePage) {
            case models.PROFILE:
                this.infoContainer.show(new ProfileView({
                    model: this.profileModel
                }));
                break;
            case models.ACCOUNT:
                this.infoContainer.show(new AccountView({
                    model: this.tokenModel
                }));
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
