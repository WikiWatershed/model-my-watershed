"use strict";

var Backbone = require('../../shim/backbone');

var ACCOUNT = 'account';
var PROFILE = 'profile';

var AccountContainerModel = Backbone.Model.extend({
    defaults: {
        active_page: PROFILE
    }
});

module.exports = {
    ACCOUNT: ACCOUNT,
    PROFILE: PROFILE,
    AccountContainerModel: AccountContainerModel
};
