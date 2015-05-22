"use strict";

// Global jQuery needed for Bootstrap plugins.
var $ = require('jquery');
window.jQuery = window.$ = $;
require('bootstrap');
require('bootstrap-select');
var R = require('retina.js');

var wbm = require('./water_balance/models');

var initialize = function(model) {
    // Used to convert slider values into data keys
    var precipKey = ['0.5', '1.0', '2.0', '3.2', '8.0'];

    // Cache references to DOM elements so as not to query them each time
    var $et = $('#column-et');
    var $r  = $('#column-r');
    var $i  = $('#column-i');

    var $thumbsLand = $('#thumbs-land');
    var $thumbsSoil = $('#thumbs-soil');
    var $precipSlider = $('#precip-slider');

    var $precipText = $('#well-precip > h1');
    var $evapoText = $('#well-evapo > h1');
    var $runoffText = $('#well-runoff > h1');
    var $infilText = $('#well-infil > h1');

    var getType = function($el) {
        // Return thumb type, after the 'thumb-' part of id
        return $el.attr('id').substring(6);
    };

    var recalculate = function() {
        var soil = getType($thumbsSoil.children('.active'));
        var land = getType($thumbsLand.children('.active'));
        var precip = precipKey[$precipSlider.val()];

        var result = model[soil][land][precip];

        $precipText.text(precip + '"');
        $evapoText.text(result.et + '"');
        $runoffText.text(result.r + '"');
        $infilText.text(result.i + '"');

        var total = parseFloat(result.et) + parseFloat(result.r) + parseFloat(result.i);
        $et.css('height', (100 * result.et / total) + '%');
        $r.css('height', (100 * result.r / total) + '%');
        $i.css('height', (100 * result.i / total) + '%');

        // Set border radius for middle Runoff div
        // which has rounded borders whenever it is on the edge
        // but not when it is in the middle
        var topRadius = (parseFloat(result.et) === 0) ? '0.3rem' : '0';
        var bottomRadius = (parseFloat(result.i) === 0) ? '0.3rem' : '0';

        $r.css({
            'border-top-left-radius': topRadius,
            'border-top-right-radius': topRadius,
            'border-bottom-left-radius': bottomRadius,
            'border-bottom-right-radius': bottomRadius
        });
    };

    // Wire up events
    $precipSlider.on('input', recalculate);
    $('a[data-toggle="tab"]').on('shown.bs.tab', recalculate);

    // Trigger the first time page loads
    recalculate();
};

$(function() {
    R.Retina.init(window);
    $('[data-toggle="tooltip"]').tooltip();

    $.ajax({
        type: 'GET',
        url: '/static/data/water_balance/model.csv',
        dataType: 'text',
        success: function(data) {
            var model = wbm.WaterBalanceModel.populateModel(data);
            initialize(model);
        }
    });
});
