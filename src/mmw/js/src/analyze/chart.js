"use strict";

var d3 = require('d3');

// Somewhat based on the reusable chart pattern
// by Mike Bostock http://bost.ocks.org/mike/chart/
// and http://bl.ocks.org/mbostock/3885304
function makeBarChart(selector, data, xValue, yValue) {
    var margin = {top: 20, right: 20, bottom: 30, left: 80},
        width = 750 - margin.left - margin.right,
        height = 375 - margin.top - margin.bottom;

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
        .ticks(10, "%");

    var svg = d3.select(selector).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(data.map(function(d) { return d[xValue]; }));
    y.domain([0, d3.max(data, function(d) { return d[yValue]; })]);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(yValue.toUpperCase());

    svg.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d[xValue]); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d[yValue]); })
      .attr("height", function(d) { return height - y(d[yValue]); });
}

module.exports = {
    makeBarChart: makeBarChart
};
