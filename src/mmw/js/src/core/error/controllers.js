"use strict";

var ErrorHandlers = require('./handlers').ErrorHandlers;

var ErrorController = {
    error: function(type) {
        switch(type) {
            case 'itsi':
                ErrorHandlers.itsi();
                break;
            case 'hydroshare-not-found':
                ErrorHandlers.hydroshareNotFound();
                break;
            default:
                ErrorHandlers.generic(type);
        }
    }
};

module.exports = {
    ErrorController: ErrorController
};
