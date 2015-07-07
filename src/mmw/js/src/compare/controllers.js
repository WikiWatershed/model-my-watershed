"use strict";

var $ = require('jquery');

var CompareController = {
    compare: function() {
        // TODO: Move to view
        $('#compare-tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        $('#scenario-tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        $('.selectpicker').selectpicker({
            tickIcon: ''
        });

        $('[data-toggle="tooltip"]').tooltip();
    }
};

module.exports = {
    CompareController: CompareController
};
