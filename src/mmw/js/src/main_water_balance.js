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
    var $etColumn = $('#column-et');
    var $rColumn  = $('#column-r');
    var $iColumn  = $('#column-i');

    var $etArrow = $('#effect-evapo svg');
    var $rArrow = $('#effect-runoff svg');
    var $iArrow = $('#effect-infiltration svg');

    var $thumbsLand = $('#thumbs-land');
    var $thumbsSoil = $('#thumbs-soil');
    var $precipSlider = $('#precip-slider');

    var $precipText = $('#well-precip > h1');
    var $etText = $('#well-evapo > h1');
    var $rText = $('#well-runoff > h1');
    var $iText = $('#well-infil > h1');

    var $runOffAlert = $('#alert');

    var getType = function($el) {
        // Return thumb type, after the 'thumb-' part of id
        return $el.attr('id').substring(6);
    };

    // The following two magic methods have been replicated from the old flash app
    var percentToScale = function(percent) {
        var s = Math.pow(percent, 1/3) + 0.2;
        return ((s - 0.9) / 2.1) * 1.7 + 0.5;
    };

    var scaleArrow = function($arrow, result) {
        var scale = 0;
        if (result) {
            scale = Math.min(percentToScale(result), 3.2);
            scale = Math.max(scale, 0.2);
        }

        $arrow.css('height', (100 * scale) + '%');
    };

    var showRunoffAlert = function() {
        $runOffAlert.show();
    };

    var hideRunoffAlert = function() {
        $runOffAlert.hide();
    };

    var recalculate = function() {
        hideRunoffAlert();

        var soil = getType($thumbsSoil.children('.active'));
        var land = getType($thumbsLand.children('.active'));
        var precip = precipKey[$precipSlider.val()];

        var result = model[soil][land][precip];

        $precipText.text(convertToMetric(precip) + ' cm');
        $etText.text(convertToMetric(result.et) + ' cm');
        $rText.text(convertToMetric(result.r) + ' cm');
        $iText.text(convertToMetric(result.i) + ' cm');

        var total = parseFloat(result.et) + parseFloat(result.r) + parseFloat(result.i);
        $etColumn.css('height', (100 * result.et / total) + '%');
        $rColumn.css('height', (100 * result.r / total) + '%');
        $iColumn.css('height', (100 * result.i / total) + '%');

        scaleArrow($etArrow, result.et);
        scaleArrow($rArrow, result.r);
        scaleArrow($iArrow, result.i);

        // Set border radius for middle Runoff div
        // which has rounded borders whenever it is on the edge
        // but not when it is in the middle
        var topRadius = (parseFloat(result.et) === 0) ? '0.3rem' : '0';
        var bottomRadius = (parseFloat(result.i) === 0) ? '0.3rem' : '0';

        if(result.r >= 2) {
            showRunoffAlert();
        }

        $rColumn.css({
            'border-top-left-radius': topRadius,
            'border-top-right-radius': topRadius,
            'border-bottom-left-radius': bottomRadius,
            'border-bottom-right-radius': bottomRadius
        });
    };

    var convertToMetric = function(value) {
        // 2.54 cm per inch.
        return (value * 2.54).toFixed(1);
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
