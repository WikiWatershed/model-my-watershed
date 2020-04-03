"use strict";

var ErrorHandlers = require('./handlers').ErrorHandlers;

var ErrorController = {
    error: function(type) {
        switch(type) {
            case 'sso':
                ErrorHandlers.sso();
                break;
            case 'hydroshare-not-found':
                ErrorHandlers.hydroshareNotFound();
                break;
            case 'hydroshare-not-logged-in':
                ErrorHandlers.hydroshareNotLoggedIn();
                break;
            default:
                ErrorHandlers.generic(type);
        }
    }
};

module.exports = {
    ErrorController: ErrorController
};
