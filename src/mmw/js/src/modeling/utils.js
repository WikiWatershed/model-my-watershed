"use strict";

var _ = require('lodash'),
    App = require('../app');

module.exports = {
    isEditable: function(scenario) {
        return App.user.userMatch(scenario.get('user_id'));
    },

    // Given a path like '/media/p29/s46/albanyRCP8520802100daily_EWIEWhh.csv',
    // returns the file name 'albanyRCP8520802100daily_EWIEWhh.csv'.
    getFileName: function(path) {
        if (!_.isString(path) || path.length < 1) {
            return false;
        }

        return path.substring(path.lastIndexOf('/') + 1);
    },
};
