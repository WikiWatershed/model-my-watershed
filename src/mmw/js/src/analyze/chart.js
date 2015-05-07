"use strict";

var d3 = require('d3'),
    $ = require('jquery');

// Somewhat based on the reusable chart pattern
// by Mike Bostock http://bost.ocks.org/mike/chart/
// and http://bl.ocks.org/mbostock/3885304
//
// options is an optional argument that has optional properties: horizMargin, vertMargin, useHorizBars,
// height, width and numYTicks.
// If height and/or width aren't specified, then they are responsive (ie. set automatically according to the
// size of the element selected by selector).
// If useHorizBars == true, then the bars are oriented horizontally and horizMargin is used. By default,
// the bars are vertical.
function makeBarChart(selector, data, xValue, yValue, options) {
    var options = options || {},
        numYTicks = options.numYTicks || 10,
        hiddenSize = 100,
        horizMargin = options.horizMargin || {top: 20, right: 20, bottom: 40, left: 120},
        vertMargin = options.vertMargin || {top: 20, right: 20, bottom: 30, left: 40},
        useHorizBars = options.useHorizBars != undefined ? options.useHorizBars : false,
        containerWidth,
        width,
        containerHeight,
        height,
        x,
        y,
        xAxis,
        yAxis,
        svg,
        chartGroup,
        xAxisGroup,
        yAxisGroup,
        yLabelText,
        bars;

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

    var renderVertical = function() {
        computeSizes(vertMargin);

        x = d3.scale.ordinal()
            .rangeRoundBands([0, width], 0.1);

        y = d3.scale.linear()
            .range([height, 0]);

        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(numYTicks, "%");

        svg = d3.select(selector).append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        chartGroup = svg.append("g")
            .attr("transform", "translate(" + vertMargin.left + "," + vertMargin.top + ")");

        x.domain(data.map(function(d) { return d[xValue]; }));
        y.domain([0.0, d3.max(data, function(d) { return d[yValue]; })]);

        xAxisGroup = chartGroup.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        yAxisGroup = chartGroup.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        yLabelText = yAxisGroup.append("g")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(yValue.toUpperCase());

        bars = chartGroup.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d[xValue]); })
            .attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d[yValue]); })
            .attr("height", function(d) { return height - y(d[yValue]); });
    };

    var renderHorizontal = function() {
        computeSizes(horizMargin);

        // x is still horizontal but now represents the dependent variable, and y is vertical
        x = d3.scale.linear()
            .range([0, width]);

        y = d3.scale.ordinal()
            .rangeRoundBands([0, height], 0.1);

        xAxis = d3.svg.axis()
            .orient("bottom")
            .scale(x)
            .ticks(numYTicks, "%");

        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        svg = d3.select(selector).append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        chartGroup = svg.append("g")
            .attr("transform", "translate(" + horizMargin.left + "," + horizMargin.top + ")");

        x.domain([0.0, d3.max(data, function(d) { return d[yValue]; })]);
        y.domain(data.map(function(d) { return d[xValue]; }));

        xAxisGroup = chartGroup.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        yAxisGroup = chartGroup.append("g")
            .attr("class", "x axis")
            .call(yAxis);

        yLabelText = yAxisGroup.append("g")
            .append("text")
            .attr("x", (x.range()[0] + x.range()[1]) / 2)
            .attr("y", height + 30)
            .style("text-anchor", "middle")
            .text(yValue.toUpperCase());

        bars = chartGroup.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", x.domain()[0])
            .attr("width", function(d) { return x(d[yValue]); })
            .attr("y", function(d) { return y(d[xValue]); })
            .attr("height", y.rangeBand());
    };


    // Ideas for making d3 charts responsive from
    // http://eyeseast.github.io/visible-data/2013/08/28/responsive-charts-with-d3/
    var resizeVertical = function() {
        computeSizes(vertMargin);

        x.rangeRoundBands([0, width], 0.1);
        xAxis.scale(x);
        xAxisGroup.attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        y.range([height, 0]);
        yAxis.scale(y);
        yAxisGroup.call(yAxis);

        bars.attr("x", function(d) { return x(d[xValue]); })
            .attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d[yValue]); })
            .attr("height", function(d) { return height - y(d[yValue]); });

        svg.attr("width", containerWidth)
            .attr("height", containerHeight);
    };

    var resizeHorizontal = function() {
        computeSizes(horizMargin);

        x.range([0, width]);
        xAxis.scale(x);
        xAxisGroup.attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        y.rangeRoundBands([0, height], 0.1);
        yAxis.scale(y);
        yAxisGroup.call(yAxis);

        bars.attr("x", x.domain()[0])
            .attr("width", function(d) { return x(d[yValue]); })
            .attr("y", function(d) { return y(d[xValue]); })
            .attr("height", y.rangeBand());

        svg.attr("width", containerWidth)
            .attr("height", containerHeight);

        yLabelText.attr("x", (x.range()[0] + x.range()[1]) / 2)
            .attr("y", height + 30);
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
