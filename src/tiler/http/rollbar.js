'use strict';

var Rollbar = require('rollbar'),
    token = process.env.ROLLBAR_SERVER_SIDE_ACCESS_TOKEN,
    stackType = process.env.MMW_STACK_TYPE;

module.exports = token ? new Rollbar({
        accessToken: token,
        environment: stackType,
    }) : {
    handleError: ex => { console.error(ex); },
    errorHandler: () => {},
};
