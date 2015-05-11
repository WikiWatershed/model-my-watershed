"use strict";

// Global jQuery needed for Bootstrap plugins.
var $ = require('jquery');
window.jQuery = window.$ = $;
require('bootstrap');
require('bootstrap-select');
var R = require('retina.js');

$(function() {
    R.Retina.init(window);
    $('[data-toggle="tooltip"]').tooltip();
});
