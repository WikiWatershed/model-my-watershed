"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    R = require('retina.js'),
    shutterbug = require('../shim/shutterbug'),
    modificationConfig = require('./core/modificationConfig.json'),
    wbm = require('./water_balance/models');

// Global jQuery needed for Bootstrap plugins.
window.jQuery = window.$ = $;
require('bootstrap');
require('bootstrap-select');

var initialize = function(model) {
    // Used to convert slider values into data keys
    var precipKey = ['1', '3', '5', '8', '21'];

    // Cache references to DOM elements so as not to query them each time
    var $etColumn = $('#column-et'),
        $rColumn  = $('#column-r'),
        $iColumn  = $('#column-i'),

        $etArrow = $('#effect-evapo svg'),
        $rArrow = $('#effect-runoff svg'),
        $iArrow = $('#effect-infiltration svg'),

        $thumbsLand = $('#thumbs-land'),
        $thumbsSoil = $('#thumbs-soil'),
        $precipSlider = $('#precip-slider'),

        $precipText = $('#well-precip > h1'),
        $etText = $('#well-evapo > h1'),
        $rText = $('#well-runoff > h1'),
        $iText = $('#well-infil > h1'),

        $runOffAlert = $('#alert');

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

        var soil = getType($thumbsSoil.children('.active')),
            land = getType($thumbsLand.children('.active')),
            precip = precipKey[$precipSlider.val()],
            result = model[soil][land][precip];

        $precipText.text(tenthsPlace(precip) + ' cm');
        $etText.text(tenthsPlace(result.et) + ' cm');
        $rText.text(tenthsPlace(result.r) + ' cm');
        $iText.text(tenthsPlace(result.i) + ' cm');

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
        var topRadius = (parseFloat(result.et) === 0) ? '0.3rem' : '0',
            bottomRadius = (parseFloat(result.i) === 0) ? '0.3rem' : '0';

        if(result.r >= 2) {
            showRunoffAlert();
        }

        $rColumn.css({
            'border-top-left-radius': topRadius,
            'border-top-right-radius': topRadius,
            'border-bottom-left-radius': bottomRadius,
            'border-bottom-right-radius': bottomRadius
        });

        // Set slider value attribute for screenshots
        $precipSlider.attr('value', $precipSlider.val());
    };

    function tenthsPlace(x) {
        return parseFloat(x).toFixed(1);
    }

    // Wire up events
    $precipSlider.on('input', recalculate);
    $('a[data-toggle="tab"]').on('shown.bs.tab', recalculate);

    // Trigger the first time page loads
    recalculate();
};

var initBootstrap = function() {
    $('[data-toggle="tooltip"]').tooltip();

    $('[data-toggle="popover"]').each(function(i, popover) {
        var $popover = $(popover),
            nlcd = $popover.data('nlcd') || 'default',
            template = '<div class="popover" role="tooltip">' +
                '<div class="arrow"></div>' +
                '<h3 class="popover-title ' + ' ' + nlcd + '"></h3>' +
                '<div class="popover-content"></div></div>',
            entry = modificationConfig[$popover.data('name')],
            options = {
                content: entry.summary,
                template: template,
                title: entry.name
            };

        if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            $popover.popover(_.extend(options, {triggger:'click'}));

            $popover.click(function() {
                $('[data-toggle="popover"]').not(this).popover('hide'); //all but this
            });
        } else {
            $popover.popover(_.extend(options, {trigger: 'hover'}));
        }
    });
};

$(function() {
    R.Retina.init(window);
    initBootstrap();

    $.ajax({
        type: 'GET',
        url: '/static/data/water_balance/model.csv',
        dataType: 'text',
        success: function(data) {
            var model = wbm.WaterBalanceModel.populateModel(data);
            initialize(model);
        }
    });

    // Enable screenshot functionality
    shutterbug.enable('body');
});
