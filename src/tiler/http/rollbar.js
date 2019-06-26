'use strict';

var Rollbar = require('rollbar'),
    token = process.env.ROLLBAR_SERVER_SIDE_ACCESS_TOKEN;

module.exports = token ? new Rollbar(token) : {
    handleError: ex => { console.error(ex); },
    errorHandler: () => {},
};
