"use strict";

var d3 = require('d3'),
    nv = require('nvd3'),
    $ = require('jquery'),
    _ = require('lodash');

function makeSvg(el) {
    // For some reason, the chart will only render if the style is
    // defined inline, even if it is blank.
    var svg = $('<svg style=""></svg>').get(0);
    $(el).empty();
    $(svg).appendTo(el);
    return svg;
}

function handleCommonOptions(chart, options) {
    if (options.yAxisLabel) {
        chart.yAxis.axisLabel(options.yAxisLabel);
    }
    if (options.isPercentage) {
        chart.yAxis.tickFormat(d3.format('.0%'));
    }
    if (options.abbreviateTicks) {
        chart.yAxis.tickFormat(d3.format('.2s'));
    }
}

/*
    Renders a horizontal bar chart for a single series of data without a legend.

    data is of the form
    [
        {
            x: ...,
            y: ...
        },
        ...
    ]
    note that x corresponds to the vertical axis since this is a horizontal bar
    chart.

    options includes: barClasses, margin, yAxisLabel, isPercentage,
    and abbreviateTicks
*/
function renderHorizontalBarChart(chartEl, data, options) {
    var chart = nv.models.multiBarHorizontalChart(),
        svg = makeSvg(chartEl);

    // Augment data so that it is part of a single series to match
    // the format expected by NVD3.
    data = [
        {
          key: 'Series 1',
          values: data
        }
    ];


    // The colors and barColors methods on chart do not
    // support the behavior we want.
    function addBarClasses() {
        var bars = $(chartEl).find('.nv-bar'),
            oldClass,
            newClass;

        _.each(bars, function(bar, i) {
            // Can't use addClass on SVG elements.
            oldClass = $(bar).attr('class');
            newClass = oldClass + ' ' + options.barClasses[i];
            $(bar).attr('class', newClass);
        });
    }

    function updateChart() {
        // Throws error if updating a hidden svg.
        if($(svg).is(':visible')) {
            chart.update();
            if (options.barClasses) {
                addBarClasses();
            }
        }
    }

    options = options || {};

    nv.addGraph(function() {
        chart.showLegend(false)
             .showControls(false)
             .duration(0)
             .margin(options.margin || {top: 30, right: 30, bottom: 40, left: 200});

        chart.tooltip.enabled(false);
        chart.yAxis.ticks(5);
        handleCommonOptions(chart, options);

        d3.select(svg)
            .datum(data)
            .call(chart);

        if (options.barClasses) {
            addBarClasses();
        }

        nv.utils.windowResize(updateChart);
        // The bar-chart:refresh event occurs when switching tabs which requires
        // redrawing the chart.
        $(chartEl).on('bar-chart:refresh', updateChart);

        return chart;
    });
}

/*
    Renders a stacked vertical bar chart for multiple series of data
    with a legend.

    data is of the form
    [
        {
            key: series-name,
            values: [
                {
                    x: ...,
                    y: ...
                },
                ...
            ]
        },
        ...
   ]
   where a series corresponds to a group of data that will be displayed with
   the same color/legend item. Eg. Runoff

    options includes: margin, yAxisLabel, seriesColors, isPercentage,
    and abbreviateTicks
*/
function renderVerticalBarChart(chartEl, data, options) {
    var chart = nv.models.multiBarChart(),
        svg = makeSvg(chartEl);

    function updateChart() {
        if($(svg).is(':visible')) {
            // Throws error if updating a hidden svg.
            chart.update();
        }
    }

    options = options || {};

    nv.addGraph(function() {
        chart.showLegend(true)
             .showControls(false)
             .stacked(true)
             .reduceXTicks(false)
             .staggerLabels(true)
             .duration(0)
             .margin(options.margin || {top: 20, right: 30, bottom: 40, left: 60});

        // Throws error if this is not set to false for unknown reasons.
        chart.legend.rightAlign(false);
        chart.tooltip.enabled(false);
        chart.yAxis.ticks(5);
        if (options.seriesColors) {
            chart.color(options.seriesColors);
        }
        handleCommonOptions(chart, options);

        d3.select(svg)
            .datum(data)
            .call(chart);

        nv.utils.windowResize(updateChart);
        // The bar-chart:refresh event occurs when switching tabs which requires
        // redrawing the chart.
        $(chartEl).on('bar-chart:refresh', updateChart);

        return chart;
    });
}

module.exports = {
    renderHorizontalBarChart: renderHorizontalBarChart,
    renderVerticalBarChart: renderVerticalBarChart
};
