"use strict";

var d3 = require('d3'),
    nv = require('../../shim/nv.d3.js'),
    $ = require('jquery'),
    _ = require('lodash'),
    utils = require('./utils');

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
    $(chartEl).children().on('destroyed', function() {
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
        margin: {top: 30, right: 30, bottom: 40, left: 210},
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
        margin: {top: 20, right: 30, bottom: 40, left: 60},
        yTickFormat: '.02f',
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
            .tickFormat(d3.format(options.yTickFormat));

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

function renderCompareMultibarChart(chartEl, name, label, colors, stacked, yMax, data, columnWidth, xAxisWidth, callback) {
    var options = {
            margin: {
                top: 20,
                bottom: 20,
                left: 60,
            },
        },
        onRenderComplete = (callback) ? callback : _.noop,
        yTickFormat = stacked ? '0.1f' : yFormat(),
        chart = nv.models.multiBarChart(),
        svg = makeSvg(chartEl),
        $svg = $(svg);

    function setChartWidth() {
        var scenarioCount = _.size(_.head(data).values),
            scenariosWidth = scenarioCount * columnWidth + xAxisWidth;

        chartEl.style.width = scenariosWidth + "px";
        chart.width(chartEl.offsetWidth);
    }

    function yFormat() {
        var getYs = function(d) { return _.map(d.values, 'y'); },
            nonZero = function(x) { return x > 0; },
            ys = _(data).map(getYs).flatten().filter(nonZero).value(),
            minY = Math.min.apply(null, ys);

        if (minY > 1) {
            return '0.1f';
        }

        // Count decimal places to most significant digit, up to 4
        for (var i = 0; minY < 1 && i < 4; i++) {
            minY *= 10;
        }

        return '0.0' + i + 'f';
    }

    nv.addGraph(function() {
        chart.showLegend(false)
             .showControls(false)
             .stacked(stacked)
             .reduceXTicks(false)
             .staggerLabels($svg.width() < widthCutoff)
             .duration(0)
             .margin(options.margin)
             .color(colors)
             .showXAxis(false)
             .id(name);

        chart.yAxis
             .axisLabel(label)
             .tickFormat(d3.format(yTickFormat))
             .showMaxMin(false);

        chart.tooltip.enabled(true);

        setChartWidth();

        if (yMax !== null) {
            chart.yDomain([0, yMax]);
        }

        d3.select(svg)
            .datum(data)
            .call(chart);

        // The clipPath that nvd3 creates wraps the bars,
        // not the bars+tooltip. Scale and move the clipPath
        // so it doesn't cut the tooltip off
        d3.select(svg)
            .selectAll("defs")
            .selectAll("clipPath")
            .selectAll("rect")
            .attr("height", "100%")
            .attr("width", "100%")
            .attr("transform", "translate(0, -30)");

        // filter definition for drop shadows
        var filter =
            d3.select(svg)
                .selectAll("defs")
                .append("filter")
                .attr("id","drop-shadow")
                .attr("height", "120%");

        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 2)
            .attr("result", "blur");

        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 2)
            .attr("dy", 2)
            .attr("result", "offsetBlur");

        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");

        var chartContainerId = chartEl.id + "-chart-container";

        // iterate over the series names to add the svg elements to the chart
        _.forEach(["nv-series-0", "nv-series-1", "nv-series-2"],
            function(el) {
                d3.select("#" + chartEl.id).select("svg").selectAll("g." + el).each(function() {
                    var g = d3.select(this);
                    var parentG = d3.select(this.parentNode);
                    parentG.attr("id", chartContainerId);

                    g.selectAll(".nv-bar").each(function(bar) {
                        // If the value is zero, and the chart
                        // is stacked, don't show any tooltip
                        if (stacked && parseFloat(bar.y) === 0) {
                            return;
                        }

                        var b = d3.select(this);
                        var barWidth = b.attr("width");
                        var bgWidth = 40.0;
                        var bgHeight = 20.0;
                        var bgVertOffset = -20.0;

                        var dialogTickSize = 5.0;

                        // add drop-shadow
                        parentG.append("rect")
                            .each(function () {
                                d3.select(this).attr({
                                    "transform": b.attr("transform"),
                                    "y": (parseFloat(b.attr("y")) + bgVertOffset - 1),
                                    "x": (parseFloat(b.attr("x")) + (parseFloat(barWidth) / 2) - (bgWidth / 2) - 1),
                                    "width": bgWidth + 2,
                                    "height": bgHeight + 2,
                                    "stroke": 1,
                                    "class": ("bar-value-text-bg-shadow " + el)
                                });

                                d3.select(this).style({
                                    "fill": "#aaaaaa",
                                    "opacity": 0,
                                    "fill-opacity": 0,
                                    "filter": "url(#drop-shadow)"
                                });
                            });

                        // add background shape
                        parentG.append("rect")
                            .each(function() {
                                d3.select(this).attr({
                                    "transform": b.attr("transform"),
                                    "y": (parseFloat(b.attr("y")) + bgVertOffset),
                                    "x": (parseFloat(b.attr("x")) + (parseFloat(barWidth) / 2) - (bgWidth / 2)),
                                    "width": bgWidth,
                                    "height": bgHeight,
                                    "stroke": "#aaaaaa",
                                    "stroke-width": 0.5,
                                    "class": ("bar-value-text-bg " + el)
                                });

                                d3.select(this).style({
                                    "fill": "white",
                                    "opacity": "0",
                                    "fill-opacity": "0",
                                    "stroke-opacity": 0.75
                                });
                            });

                        // add tick mark under shape
                        parentG.append("rect")
                            .each(function() {
                                var rotatedX = parseFloat(b.attr("x")) + parseFloat(barWidth) / 2;
                                var rotatedY = parseFloat(b.attr("y")) + bgHeight + bgVertOffset - (dialogTickSize / 2);
                                d3.select(this).attr({
                                    "transform": (b.attr("transform") + " rotate(45," + rotatedX +"," + rotatedY + ")"),
                                    "y": (parseFloat(b.attr("y")) + bgHeight + bgVertOffset - dialogTickSize),
                                    "x": (parseFloat(b.attr("x")) + (parseFloat(barWidth) / 2)),
                                    "width": dialogTickSize,
                                    "height": dialogTickSize,
                                    "class": ("bar-value-text-bg-tick " + el)
                                });

                                d3.select(this).style({
                                    "fill": "white",
                                    "fill-opacity": "0",
                                    "opacity": "0"
                                });
                            });

                        // add the text value
                        parentG.append("text")
                            .each(function() {
                                d3.select(this).text(function() {
                                    return parseFloat(bar.y).toFixed(3);
                                });

                                var width = this.getBBox().width;

                                d3.select(this).attr({
                                    "transform": b.attr("transform"),
                                    "y": (parseFloat(b.attr("y")) + 15 + bgVertOffset),
                                    "x": (parseFloat(b.attr("x")) + (parseFloat(barWidth) / 2) - (width / 2)),
                                    "font-size": "0.8rem",
                                    "font-weight": "normal",
                                    "font-family": "helvetica",
                                    "class": ("bar-value-text " + el)
                                });

                                d3.select(this).style({
                                    "stroke": "black",
                                    "stroke-width": 0.2,
                                    "opacity": 0,
                                    "font-weight": "normal",
                                    "font-family": "arial"
                                });

                            });
                    });
                });

                d3.select(svg)
                    .select("#" + chartContainerId)
                    .selectAll("g." + el)
                    .selectAll("rect.nv-bar")
                    .on("mouseover", function () {
                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text." + el)
                            .style("opacity", "1");

                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text-bg-shadow." + el)
                            .style("opacity", "0.5")
                            .style("fill-opacity", "0.5");

                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text-bg." + el)
                            .style("opacity", "1")
                            .style("fill-opacity", "1");

                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text-bg-tick." + el)
                            .style("opacity", "1")
                            .style("fill-opacity", "1");
                    });

                d3.select(svg)
                    .select("#" + chartContainerId)
                    .selectAll("g." + el)
                    .selectAll("rect.nv-bar")
                    .on("mouseout", function () {
                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text." + el)
                            .style("opacity", "0");

                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text-bg-shadow." + el)
                            .style("opacity", "0")
                            .style("fill-opacity", "0");

                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text-bg." + el)
                            .style("opacity", "0")
                            .style("fill-opacity", "0");

                        d3.select("#" + chartContainerId)
                            .selectAll(".bar-value-text-bg-tick." + el)
                            .style("opacity", "0")
                            .style("fill-opacity", "0");
                    });
            });


        return chart;
    }, onRenderComplete);
}

function renderBulletChart(chartEl, title, subtitle, data) {
    var chart = nv.models.bulletChart(),
        svg = makeSvg(chartEl),
        range = utils.rangeInMagnitude(data),
        datum = {
            title: title,
            subtitle: subtitle,
            ranges: [range.min, 0, range.max],
            measures: [data],
            color: '#48c5d1',
        };

    chart.tooltip.valueFormatter(d3.format('.02f'));

    d3.select(svg)
        .datum(datum)
        .call(chart);

    removeTooltipOnDestroy(chartEl, chart.tooltip);

    return chart;
}

module.exports = {
    renderHorizontalBarChart: renderHorizontalBarChart,
    renderVerticalBarChart: renderVerticalBarChart,
    renderLineChart: renderLineChart,
    renderCompareMultibarChart: renderCompareMultibarChart,
    renderBulletChart: renderBulletChart,
};
