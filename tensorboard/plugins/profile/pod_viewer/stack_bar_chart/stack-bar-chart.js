/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
var pod_viewer_stack_bar_chart;
(function (pod_viewer_stack_bar_chart) {
    var BAR_WIDTH = 50;
    var SVG_HEIGHT = 300;
    var SVG_MIN_WIDTH = 1600;
    var SVG_MARGIN = { top: 20, right: 20, bottom: 30, left: 100 };
    /** constants for legends */
    var LEGEND_WIDTH = 150;
    var LEGEND_HEIGHT = 30;
    var ICON_SIZE = 19;
    var LABELS_PER_LANE = 5;
    var LEGEND_MARGIN = 5;
    var YAXIS_TO_LEGEND = 200;
    var LEGEND_TEXT_HEIGHT = 9.5;
    var LEGEND_TEXT_SIZE = '0.32em';
    var FONT_SIZE = 14;
    var TRANSITION_DURATION = 1000;
    Polymer({
        is: 'stack-bar-chart',
        properties: {
            data: {
                type: Array,
                value: function () { return []; },
                observer: '_dataChanged',
            },
            activeBar: {
                type: Object,
                notify: true,
            },
            xDomainFunc: {
                type: Object,
            },
            stackLayers: {
                type: Array,
                value: function () { return []; },
                observer: '_onStackLayersChanged',
            },
        },
        /**
         * Main function to draw a stacked bar chart.
         */
        stackBarChart: function (data) {
            if (!data.length || !this.isAttached || this.stackLayers.length == 0) {
                return;
            }
            var stackKey = this.stackLayers.map(function (d) { return d.key; });
            var stackLabel = this.stackLayers.map(function (d) { return d.label; });
            var height = SVG_HEIGHT - SVG_MARGIN.top - SVG_MARGIN.bottom;
            var xScaleRange = data.length * BAR_WIDTH;
            var xScale = d3.scaleBand().range([0, xScaleRange]).padding(0.4);
            var yScale = d3.scaleLinear().range([height, 0]);
            var colorScale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain([0, 19]);
            var svg = d3.select(this.$.chart).select('svg');
            if (svg.empty()) {
                svg = d3.select(this.$.chart).append('svg')
                    .attr('width', Math.max(SVG_MIN_WIDTH, xScaleRange + SVG_MARGIN.left + SVG_MARGIN.right))
                    .attr('height', SVG_HEIGHT)
                    .append('g')
                    .attr('transform', 'translate(' + SVG_MARGIN.left + ',' + SVG_MARGIN.top + ')');
                // Draw x-axis.
                svg.append('g')
                    .attr('class', 'x axis')
                    .style('font-size', FONT_SIZE)
                    .attr('transform', 'translate(0,' + (height + 5) + ')');
                // Draw y-axis.
                svg.append('g')
                    .attr('class', 'y axis')
                    .style('font-size', FONT_SIZE)
                    .attr('transform', 'translate(0,0)');
            }
            var stack = d3.stack().keys(stackKey).order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone);
            var layers = stack(data);
            xScale.domain(data.map(this.xDomainFunc));
            yScale.domain([0, d3.max(layers[layers.length - 1], function (d) { return d[0] + d[1]; })])
                .nice();
            this.drawLayers(svg, layers, xScale, yScale, colorScale);
            this.drawAxes(svg, xScale, yScale, height);
            var legend = d3.select(this.$.chart).select('.legend');
            if (legend.empty()) {
                legend = svg.append('g')
                    .attr('class', 'legend')
                    .attr('font-family', 'sans-serif')
                    .attr('font-size', FONT_SIZE)
                    .attr('text-anchor', 'start');
            }
            this.drawLegend(legend, stackLabel, colorScale);
        },
        /**
         * Draw the layers for all the bars.
         */
        drawLayers: function (svg, layers, xScale, yScale, colorScale) {
            var parent = this;
            // Update layer for each metric across all cores, and rect for each core.
            var layer = svg.selectAll('.layer').data(layers);
            var rects = layer.enter().append('g').attr('class', 'layer').merge(layer)
                .style('fill', function (d, i) { return colorScale(i); })
                .selectAll('rect').data(function (d) { return d; });
            rects.enter().append('rect').merge(rects)
                .attr('width', xScale.bandwidth())
                .attr('y', function (d) { return yScale(d[1]); })
                .attr('height', function (d) { return yScale(d[0]) - yScale(d[1]); })
                .attr('x', function (d, i) { return xScale(parent.xDomainFunc(d.data)); })
                .on('mouseover', function (d) {
                d3.select(this).style('opacity', 0.5);
                parent.activeBar = d.data;
            })
                .on('mouseout', function (d) {
                d3.select(this).style('opacity', 1.0);
                parent.activeBar = null;
            })
                .transition()
                .duration(TRANSITION_DURATION);
            layer.exit().remove();
        },
        /**
         * Draw the axes of the chart.
         */
        drawAxes: function (svg, xScale, yScale, height) {
            svg.select('.x.axis')
                .transition()
                .duration(TRANSITION_DURATION)
                .call(d3.axisBottom(xScale));
            svg.select('.y.axis')
                .transition()
                .duration(TRANSITION_DURATION)
                .call(d3.axisLeft(yScale));
        },
        /**
         * Draw the legends of the chart.
         */
        drawLegend: function (selection, labels, colorScale) {
            var legend = selection.selectAll('g').data(labels.slice());
            legend.exit().remove();
            var legendEnter = legend.enter().append('g');
            legendEnter.append('rect')
                .attr('x', YAXIS_TO_LEGEND)
                .attr('width', ICON_SIZE)
                .attr('height', ICON_SIZE);
            legendEnter.append('text')
                .attr('x', YAXIS_TO_LEGEND + LEGEND_MARGIN + ICON_SIZE)
                .attr('y', LEGEND_TEXT_HEIGHT)
                .attr('dy', LEGEND_TEXT_SIZE);
            legend = legendEnter.merge(legend);
            legend.attr('transform', function (d, i) {
                var x = i * LEGEND_WIDTH - Math.floor(i / LABELS_PER_LANE) *
                    LEGEND_WIDTH * LABELS_PER_LANE;
                var y = Math.floor(i / LABELS_PER_LANE) * LEGEND_HEIGHT;
                return "translate(" + x + ", " + y + ")";
            });
            legend.select('rect').attr('fill', function (d, i) { return colorScale(i); });
            legend.select('text').text(function (d) { return d; });
        },
        /**
         * Redraw the stack bar chart.
         */
        redraw: function (data) {
            if (!data || data.length == 0)
                return;
            this.stackBarChart(data);
        },
        /**
         * Redraws the stack bar chart when the stack elements changed.
         */
        _onStackLayersChanged: function (newData) {
            if (!newData || newData.length == 0)
                return;
            this.redraw(this.data);
        },
        /**
         * Redraws the stack bar chart when the input data changed.
         */
        _dataChanged: function (newData) {
            if (!newData || newData.length == 0)
                return;
            this.redraw(newData);
        },
        attached: function () {
            this.redraw(this.data);
        },
    });
})(pod_viewer_stack_bar_chart || (pod_viewer_stack_bar_chart = {})); // namespace pod_viewer_stack_bar_chart
