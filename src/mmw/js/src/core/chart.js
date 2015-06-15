"use strict";

var d3 = require('d3'),
    $ = require('jquery'),
    _ = require('lodash');

// Somewhat based on the reusable chart pattern
// by Mike Bostock http://bost.ocks.org/mike/chart/
// and http://bl.ocks.org/mbostock/3885304

// indVar and depVars represent the independent and dependent variables which are displayed
// on the x or y axes depending on the orientation of the chart.
// In general, an independent variable is one that is directly controlled by an experimenter
// and is usually represented by the x-axis. A dependent variable is one that varies as
// a function of the independent variable and is usually represented on the y-axis.
// If depVars contains > 1 variable, then the function will create a stacked bar chart.
// The optional parameter options has optional properties: horizMargin, vertMargin, useHorizBars,
// height, width, numYTicks, isPercentage, depAxisLabel, depDisplayNames, and barColors.
// If height and/or width aren't specified, then they are responsive (ie. set automatically according to the
// size of the element selected by selector).
// depDisplayNames is the human readable counterpart to depVars.
// If barColors is supplied, a legend will be drawn using the colors.
function makeBarChart(selector, data, indVar, depVars, options) {
    options = options || {};

    var numYTicks = options.numYTicks || 10,
        hiddenSize = 100,
        horizMargin = options.horizMargin || {top: 20, right: 80, bottom: 40, left: 120},
        vertMargin = options.vertMargin || {top: 20, right: 80, bottom: 30, left: 40},
        useHorizBars = options.useHorizBars !== undefined ? options.useHorizBars : false,
        maxDepSum,
        containerWidth,
        width,
        containerHeight,
        height,
        x,
        y,
        color,
        xAxis,
        yAxis,
        svg,
        chartGroup,
        xAxisGroup,
        yAxisGroup,
        yLabelText,
        barGroups,
        bars,
        legend;

    // Set the upper and lower bounds of each bar chart element.
    _.forEach(data, function(datum) {
        var depLower = 0;
        datum.depVals = _.map(depVars, function(depVar, depVarInd) {
            return {
                name: depVar,
                displayName: options.depDisplayNames ? options.depDisplayNames[depVarInd] : depVar,
                depLower: depLower,
                depUpper: depLower += datum[depVar]
            };
        });
    });

    // The maximum sum of the dependent variables across data points.
    maxDepSum = d3.max(_.map(data, function(datum) {
        return d3.sum(_.map(depVars, function(depVar) {
            return datum[depVar];
        }));
    }));

    var computeSizes = function(margin) {
        // containerWidth will be 0 if the chart is in a
        // tab that is currently hidden.
        containerWidth = options.width || $(selector).get(0).offsetWidth;
        width = containerWidth - margin.left - margin.right;
        containerHeight = options.height || $(selector).get(0).offsetHeight;
        height = containerHeight - margin.top - margin.bottom;
        // Set to legal dummy value if it's non-positive because
        // the container is hidden and containerWidth == 0.
        width = width > 0 ? width : hiddenSize;
        height = height > 0 ? height : hiddenSize;
    };

    var renderLegend = function(isVertical) {
        // The constants in this function were set by trial and error to make things
        // look reasonable.
        var topMargin = isVertical ? vertMargin.top : horizMargin.top;
        legend = svg.selectAll(".legend")
            .data(data[0].depVals)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { return "translate(0," + (topMargin + i * 10) + ")"; });

        legend.append("rect")
            .attr("x", containerWidth - 10)
            .attr("y", 1)
            .attr("width", 8)
            .attr("height", 8)
            .style("fill", function(d) { return color(d.name); });

        legend.append("text")
            .attr("x", containerWidth - 15)
            .attr("y", 6)
            .attr("dy", ".2em")
            .style("text-anchor", "end")
            .style("font-size", "9px")
            .text(function(d) { return d.displayName; });
    };

    var resizeLegend = function() {
        legend.selectAll("rect")
            .attr("x", containerWidth - 10);
        legend.selectAll("text")
            .attr("x", containerWidth - 15);
    };

    var renderVertical = function() {
        computeSizes(vertMargin);

        x = d3.scale.ordinal()
            .rangeRoundBands([0, width], 0.1);

        y = d3.scale.linear()
            .rangeRound([height, 0]);

        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");
        if (options.isPercentage) {
            yAxis.ticks(numYTicks, '%');
        } else {
            yAxis.ticks(numYTicks);
        }

        svg = d3.select(selector).append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        chartGroup = svg.append("g")
            .attr("transform", "translate(" + vertMargin.left + "," + vertMargin.top + ")");

        x.domain(data.map(function(d) { return d[indVar]; }));
        y.domain([0.0, maxDepSum]);

        xAxisGroup = chartGroup.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        yAxisGroup = chartGroup.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        if (options.depAxisLabel) {
            yLabelText = yAxisGroup.append("g")
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text(options.depAxisLabel);
        }

        barGroups = chartGroup.selectAll(".bar")
            .data(data)
            .enter().append("g")
            .attr("class", "g")
            .attr("transform", function(d) {
                return "translate(" + x(d[indVar]) + ",0)";
            });

        bars = barGroups.selectAll("rect")
            .data(function(d) { return d.depVals; })
            .enter().append("rect")
            .classed('bar', true)
            .attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d.depUpper); })
            .attr("height", function(d) { return y(d.depLower) - y(d.depUpper); });

        if (options.barColors) {
            color = d3.scale.ordinal()
                .domain(depVars)
                .range(options.barColors);
            bars.style("fill", function(d) { return color(d.name); });
            renderLegend();
        }
    };

    // Ideas for making d3 charts responsive from
    // http://eyeseast.github.io/visible-data/2013/08/28/responsive-charts-with-d3/
    var resizeVertical = function() {
        if ($(selector).length > 0) {
            computeSizes(vertMargin);

            x.rangeRoundBands([0, width], 0.1);
            xAxis.scale(x);
            xAxisGroup.attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            y.range([height, 0]);
            yAxis.scale(y);
            yAxisGroup.call(yAxis);

            barGroups.attr("transform", function(d) {
                return "translate(" + x(d[indVar]) + ",0)";
            });

            bars.attr("width", x.rangeBand())
                .attr("y", function(d) { return y(d.depUpper); })
                .attr("height", function(d) { return y(d.depLower) - y(d.depUpper); });

            svg.attr("width", containerWidth)
                .attr("height", containerHeight);

            if (options.barColors) {
                resizeLegend();
            }
        }
    };

    var renderHorizontal = function() {
        computeSizes(horizMargin);

        // x is still horizontal, but now represents the dependent variable
        x = d3.scale.linear()
            .range([0, width]);

        y = d3.scale.ordinal()
            .rangeRoundBands([0, height], 0.1);

        color = d3.scale.ordinal()
            .domain(depVars)
            .range(options.barColors);

        xAxis = d3.svg.axis()
            .orient("bottom")
            .scale(x);
        if (options.isPercentage) {
            xAxis.ticks(numYTicks, "%");
        } else {
            xAxis.ticks(numYTicks);
        }

        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        svg = d3.select(selector).append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        chartGroup = svg.append("g")
            .attr("transform", "translate(" + horizMargin.left + "," + horizMargin.top + ")");

        x.domain([0.0, maxDepSum]);
        y.domain(data.map(function(d) { return d[indVar]; }));

        xAxisGroup = chartGroup.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        yAxisGroup = chartGroup.append("g")
            .attr("class", "x axis")
            .call(yAxis);

        if (options.depAxisLabel) {
            yLabelText = yAxisGroup.append("g")
                .append("text")
                .attr("x", (x.range()[0] + x.range()[1]) / 2)
                .attr("y", height + 30)
                .style("text-anchor", "middle")
                .text(options.depAxisLabel);
        }

        barGroups = chartGroup.selectAll(".bar")
                .data(data)
                .enter().append("g")
                .attr("class", "g")
                .attr("transform", function(d) {
                    return "translate(0," + y(d[indVar]) + ")";
                });

        bars = barGroups.selectAll("rect")
            .data(function(d) { return d.depVals; })
            .enter().append("rect")
            .classed('bar', true)
            .attr("width", function(d) {
                return x(d.depUpper) - x(d.depLower);
            })
            .attr("x", function(d) { return x(d.depLower); })
            .attr("height", y.rangeBand());

        if (options.barColors) {
            bars.style("fill", function(d) { return color(d.name); });
            renderLegend();
        }
    };

    var resizeHorizontal = function() {
        if ($(selector).length > 0) {
            computeSizes(horizMargin);

            x.range([0, width]);
            xAxis.scale(x);
            xAxisGroup.attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            y.rangeRoundBands([0, height], 0.1);
            yAxis.scale(y);
            yAxisGroup.call(yAxis);

            barGroups.attr("transform", function(d) {
                return "translate(0," + y(d[indVar]) + ")";
            });

            bars.attr("height", y.rangeBand())
                .attr("x", function(d) { return x(d.depLower); })
                .attr("width", function(d) { return x(d.depUpper) - x(d.depLower); });

            svg.attr("width", containerWidth)
                .attr("height", containerHeight);

            if (options.depAxisLabel) {
                yLabelText.attr("x", (x.range()[0] + x.range()[1]) / 2)
                    .attr("y", height + 30);
            }

            if (options.barColors) {
                resizeLegend();
            }
        }
    };

    if (useHorizBars) {
        renderHorizontal();
        $(window).on("resize", resizeHorizontal);
        // bar-chart-refresh events occur when a tab in the Analyze view is selected.
        // We need to listen for them since the chart might have been hidden when the last
        // resize occured, in which case the size would have been set to the default.
        $(selector).on("bar-chart:refresh", resizeHorizontal);
    } else {
        renderVertical();
        $(window).on("resize", resizeVertical);
        $(selector).on("bar-chart:refresh", resizeVertical);
    }
}

module.exports = {
    makeBarChart: makeBarChart
};
