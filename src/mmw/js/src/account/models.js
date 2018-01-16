"use strict";

var _ = require('lodash'),
    Backbone = require('../../shim/backbone');

var ACCOUNT = 'account';
var PROFILE = 'profile';
var LINKED_ACCOUNTS = 'linkedAccounts';

var AccountContainerModel = Backbone.Model.extend({
    defaults: {
        active_page: PROFILE
    }
});

var ApiTokenModel = Backbone.Model.extend({
    url: '/api/token/',

    defaults: {
        api_key: '',
        created_at: '', // Datetime of api key generation
        fetching: false, // Is fetching api key?
        error: ''
    },

    initialize: function() {
        this.fetchToken();
    },

    fetchToken: function(regenerate) {
        this.set({fetching: true,
                  error: ''});

        var data = {};

        if (regenerate) {
            data['regenerate'] = true;
        }

        var request = {
                data: JSON.stringify(data),
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json'
            },

            failFetch = _.bind(function() {
                var messageVerb = regenerate ? 'regenerate' : 'get';
                this.set('error',
                         'Unable to ' + messageVerb + ' API Key');
            }, this),

            finishFetch = _.bind(function() {
                this.set('fetching', false);
            }, this);

        return this.fetch(request)
                   .fail(failFetch)
                   .always(finishFetch);
    },

    regenerateToken: function() {
        this.fetchToken(true);
    },

    parse: function(response) {
        return {
            api_key: response.token,
            created_at: response.created_at
        };
    }
});

module.exports = {
    ACCOUNT: ACCOUNT,
    PROFILE: PROFILE,
    LINKED_ACCOUNTS: LINKED_ACCOUNTS,
    ApiTokenModel: ApiTokenModel,
    AccountContainerModel: AccountContainerModel
};
