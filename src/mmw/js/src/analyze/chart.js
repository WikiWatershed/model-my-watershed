"use strict";

var d3 = require('d3');

// Somewhat based on the reusable chart pattern
// by Mike Bostock http://bost.ocks.org/mike/chart/
// and http://bl.ocks.org/mbostock/3885304
//
// options is an optional argument that has optional properties: margin, height, width and numYTicks.
// If height and/or width aren't specified, then they are responsive (ie. set automatically according to the
// size of the element selected by selector). margin should be an object with properties
// top, right, bottom and left.
function makeBarChart(selector, data, xValue, yValue, options) {
    var options = options || {},
        margin = options.margin || {top: 20, right: 20, bottom: 30, left: 80},
        numYTicks = options.numYTicks || 10,
        // containerWidth will be 0 if the chart is in a
        // tab that is currently hidden.
        containerWidth = options.width || $(selector).get(0).offsetWidth,
        width = containerWidth - margin.left - margin.right,
        containerHeight = options.height || $(selector).get(0).offsetHeight,
        height = containerHeight - margin.top - margin.bottom;

    // Set to legal dummy value if it's non-positive because
    // the container is hidden and containerWidth == 0.
    var hiddenSize = 100;
    width = width > 0 ? width : hiddenSize;
    height = height > 0 ? height : hiddenSize;

    var x = d3.scale.ordinal()
            .rangeRoundBands([0, width], 0.1);

    var y = d3.scale.linear()
            .range([height, 0]);

    var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

    var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(numYTicks, "%");

    var svg = d3.select(selector).append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

    var chartGroup = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(data.map(function(d) { return d[xValue]; }));
    y.domain([0, d3.max(data, function(d) { return d[yValue]; })]);

    var xAxisGroup = chartGroup.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

    var yAxisGroup = chartGroup.append("g")
            .attr("class", "y axis")
            .call(yAxis);

    var yLabelGroup = yAxisGroup.append("g")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(yValue.toUpperCase());

    var bars = chartGroup.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d[xValue]); })
            .attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d[yValue]); })
            .attr("height", function(d) { return height - y(d[yValue]); });

    // Ideas for making d3 charts responsive from
    // http://eyeseast.github.io/visible-data/2013/08/28/responsive-charts-with-d3/
    var resize = function() {

        containerWidth = options.width || $(selector).get(0).offsetWidth;
        width = containerWidth - margin.left - margin.right;
        containerHeight = options.height || $(selector).get(0).offsetHeight;
        height = containerHeight - margin.top - margin.bottom;

        width = width > 0 ? width : hiddenSize;
        height = height > 0 ? height : hiddenSize;

        x.rangeRoundBands([0, width], 0.1);
        xAxis.scale(x)
            .orient("bottom");
        xAxisGroup.attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        y.range([height, 0]);
        yAxis.scale(y);
        yAxisGroup.call(yAxis);

        bars.attr("x", function(d) {
            return x(d[xValue]);
        }).attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d[yValue]); })
            .attr("height", function(d) { return height - y(d[yValue]); });

        svg.attr("width", containerWidth)
            .attr("height", containerHeight);
    };

    $(window).on("resize", resize);
    // bar-chart-refresh events occur when a tab in the Analyze view is selected.
    // We need to listen for them since the chart might have been hidden when the last
    // resize occured, in which case the size would have been set to the default.
    $(selector).on("bar-chart:refresh", resize);
}

module.exports = {
    makeBarChart: makeBarChart
};
