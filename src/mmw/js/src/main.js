"use strict";

var utils = require('./core/utils');

require('./core/setup');
require('./routes');

//
// Initialize application.
//

var $ = require('jquery'),
    Backbone = require('../shim/backbone'),
    App = require('./app'),
    router = require('./router').router;

App.on('start', function() {
    $('body').on('click', '[data-url]', function(e) {
        e.preventDefault();
        router.navigate($(this).data('url'), { trigger: true });
    });
    Backbone.history.start({ pushState: true });

    this.user.fetch();
});

App.start();

// This numeric comparator needs to be attached to window so that it
// is available for use in templates.
window.numericSort = utils.numericSort;

// This comparator sorts a table of strings which represent ordinal numbers.
window.ordinalNumericSort = utils.ordinalNumericSort;

// This comparator sorts a table with "no data" fields intermixed
// with numeric fields.
window.noDataSort = utils.noDataSort;

// This formatter appends a "%" to a value if it isn't the no data
// value
window.percentFormatter = utils.percentFormatter;

//
// Expose application so we can interact with it via JS console.
//

window.MMW = App;
window.MMW.router = router;
