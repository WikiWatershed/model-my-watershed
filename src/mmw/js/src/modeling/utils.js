"use strict";

var _ = require('lodash'),
    App = require('../app');

module.exports = {
    isEditable: function(scenario) {
        return App.user.userMatch(scenario.get('user_id'));
    },

    // Given a path like 'https://mmw-staging-data-us-east-1.s3.amazonaws.com/p1470/s2603/phillyRCP4520802100daily.csv?AWSAccessKeyId=XXX&Expires=1589820561&x-amz-security-token=YYY&Signature=ZZZ' and an extension '.csv',
    // returns the file name 'phillyRCP4520802100daily.csv'.
    getFileName: function(path, ext) {
        if (!_.isString(path) || path.length < 1) {
            return false;
        }

        var filenameWithQuerystring = path.substring(path.lastIndexOf('/') + 1);

        if (!_.isString(ext) || ext.length < 1) {
            return filenameWithQuerystring;
        }

        return filenameWithQuerystring.substring(
            0, filenameWithQuerystring.indexOf(ext) + ext.length);
    },
};
