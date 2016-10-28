"use strict";

var d3 = require('d3'),
    nv = require('../../shim/nv.d3.js'),
    $ = require('jquery'),
    _ = require('lodash');

var widthCutoff = 400;

// Make jQuery handle destroyed event.
// http://stackoverflow.com/questions/2200494/
// jquery-trigger-event-when-an-element-is-removed-from-the-dom
(function($) {
    $.event.special.destroyed = {
        remove: function(o) {
            if (o.handler) {
                o.handler();
            }
        }
    };
})($);

// When we replace a chart with a new one, the tooltip for the old chart
// persists because it resides under the body tag instead of under
// chartEl (the container div for the chart) like the other chart components.
// Therefore, we manually remove the tooltip when elements under chartEl are
// destroyed.
function removeTooltipOnDestroy(chartEl, tooltip) {
    $(chartEl).children().bind('destroyed', function() {
        $('#' + tooltip.id()).remove();
    });
}

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

function getNumBars(data) {
    return data[0].values.length;
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

    options includes: barClasses, margin, yAxisLabel, isPercentage, maxBarHeight
    and abbreviateTicks
*/
function renderHorizontalBarChart(chartEl, data, options) {
    var chart = nv.models.multiBarHorizontalChart(),
        svg = makeSvg(chartEl),
        $svg = $(svg);

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

    function setChartHeight() {
        // Set chart height to ensure that bars (and their padding)
        // are no taller than maxBarHeight.
        var numBars = getNumBars(data),
            maxHeight = options.margin.top + options.margin.bottom +
                        numBars * options.maxBarHeight,
            actualHeight = $svg.height();

        if (actualHeight > maxHeight) {
            chart.height(maxHeight);
        } else {
            chart.height(actualHeight);
        }
    }

    function updateChart() {
        var width = $svg.width(),
            availableWidth = width - (options.margin.left + options.margin.right),
            minTickWidth = 60,
            yticks = Math.floor(availableWidth / minTickWidth);

        if($svg.is(':visible')) {
            setChartHeight();
            chart.yAxis.ticks(Math.min(yticks, 5));
            chart.update(); // Throws error if updating a hidden svg.
            if (options.barClasses) {
                addBarClasses();
            }
        }
    }

    options = options || {};
    _.defaults(options, {
        margin: {top: 30, right: 30, bottom: 40, left: 200},
        maxBarHeight: 150
    });

    nv.addGraph(function() {
        chart.showLegend(false)
             .showControls(false)
             .duration(0)
             .margin(options.margin);

        setChartHeight();
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

        // This isn't strictly necessary since tooltips aren't enabled in the
        // horizontal bar chart, but it's here defensively in case we start
        // using them.
        removeTooltipOnDestroy(chartEl, chart.tooltip);

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
   where a series corresponds to a group of data that will be
   displayed with the same color/legend item. Eg. Runoff

   options includes: margin, yAxisLabel, yAxisUnit, seriesColors,
   isPercentage, maxBarWidth, abbreviateTicks, reverseLegend, and
   disableToggle
*/
function renderVerticalBarChart(chartEl, data, options) {
    var chart = nv.models.multiBarChart(),
        svg = makeSvg(chartEl),
        $svg = $(svg);

    function setChartWidth() {
        // Set chart width to ensure that bars (and their padding)
        // are no wider than maxBarWidth.
        var numBars = getNumBars(data),
            maxWidth = options.margin.left + options.margin.right +
                       numBars * options.maxBarWidth,
            actualWidth = $svg.width();

        if (actualWidth > maxWidth) {
           chart.width(maxWidth);
        } else {
           chart.width(actualWidth);
        }
    }

    function updateChart() {
        if($svg.is(':visible')) {
            setChartWidth();
            chart
                .staggerLabels($svg.width() < widthCutoff)
                .update(); // Throws error if updating a hidden svg.
        }
    }

    options = options || {};
    _.defaults(options, {
        margin: {top: 20, right: 30, bottom: 40, left: 60},
        maxBarWidth: 150
    });

    nv.addGraph(function() {
        chart.showLegend(true)
             .showControls(false)
             .stacked(true)
             .reduceXTicks(false)
             .staggerLabels($svg.width() < widthCutoff)
             .duration(0)
             .margin(options.margin);

        setChartWidth();
        // Throws error if this is not set to false for unknown reasons.
        chart.legend
            .disableToggle(options.disableToggle)
            .reverse(options.reverseLegend)
            .rightAlign(false);
        chart.tooltip.enabled(true);
        chart.yAxis.ticks(5);
        handleCommonOptions(chart, options);

        if (options.yAxisUnit) {
            chart.tooltip.valueFormatter(function(d) {
                return chart.yAxis.tickFormat()(d) + ' ' + options.yAxisUnit;
            });
        }
        if (options.seriesColors) {
            chart.color(options.seriesColors);
        }

        d3.select(svg)
            .datum(data)
            .call(chart);

        nv.utils.windowResize(updateChart);
        // The bar-chart:refresh event occurs when switching tabs which requires
        // redrawing the chart.
        $(chartEl).on('bar-chart:refresh', updateChart);

        removeTooltipOnDestroy(chartEl, chart.tooltip);

        return chart;
    });
}

// data is same format as for renderVerticalBarChart
function renderLineChart(chartEl, data, options) {
    var chart = nv.models.lineChart(),
        svg = makeSvg(chartEl);

    options = options || {};
    _.defaults(options, {
        margin: {top: 20, right: 30, bottom: 40, left: 60}
    });

    nv.addGraph(function() {
        chart.showLegend(false)
            .margin(options.margin);

        chart.xAxis
            .tickValues(options.xTickValues)
            .tickFormat(function(month) {
                return options.xAxisLabel(month);
            });

        chart.yAxis
            .axisLabel(options.yAxisLabel)
            .tickFormat(d3.format('.02f'));

        chart.tooltip.valueFormatter(function(d) {
            return chart.yAxis.tickFormat()(d) + ' ' + options.yAxisUnit;
        });

        handleCommonOptions(chart, options);

        d3.select(svg)
            .datum(data)
            .call(chart);

        return chart;
    });
}

module.exports = {
    renderHorizontalBarChart: renderHorizontalBarChart,
    renderVerticalBarChart: renderVerticalBarChart,
    renderLineChart: renderLineChart
};
