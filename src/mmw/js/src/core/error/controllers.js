"use strict";

var ErrorHandlers = require('./handlers').ErrorHandlers;

var ErrorController = {
    error: function(type) {
        switch(type) {
            case 'itsi':
                ErrorHandlers.itsi();
                break;
            default:
                ErrorHandlers.generic(type);
        }
    }
};

module.exports = {
    ErrorController: ErrorController
};
