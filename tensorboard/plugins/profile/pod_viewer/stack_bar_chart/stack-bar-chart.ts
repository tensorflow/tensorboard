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

namespace pod_viewer_stack_bar_chart {

const BAR_WIDTH = 50;
const SVG_HEIGHT = 300;
const SVG_MIN_WIDTH = 1600;
const SVG_MARGIN = {top: 20, right: 20, bottom: 30, left: 100};

/** constants for legends */
const LEGEND_WIDTH = 150;
const LEGEND_HEIGHT = 30;
const ICON_SIZE = 19;
const LABELS_PER_LANE = 5;
const LEGEND_MARGIN = 5;
const YAXIS_TO_LEGEND = 200;
const LEGEND_TEXT_HEIGHT = 9.5;
const LEGEND_TEXT_SIZE = '0.32em';

const FONT_SIZE = 14;

Polymer({
  is: 'stack-bar-chart',
  properties: {
    data: {
      type: Array,
      value: () => [],
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
      value: () => [],
      observer: '_onStackLayersChanged',
    },
  },
  /**
   * Main function to draw a stacked bar chart.
   */
  stackBarChart: function(data : Array<any>) {
    if (!data.length || !this.isAttached || this.stackLayers.length == 0) {
      return;
    }
    d3.select(this.$.chart).selectAll('g > *').remove();
    d3.select(this.$.chart).select('svg').remove();
    d3.select(this.$.chart).select('.svg-container').remove();
    const stackKey = this.stackLayers.map((d) => d.key);
    const stackLabel = this.stackLayers.map((d) => d.label);
    const height = SVG_HEIGHT - SVG_MARGIN.top - SVG_MARGIN.bottom;
    const xScaleRange = data.length * BAR_WIDTH;
    let xScale = d3.scaleBand().range([0, xScaleRange]).padding(0.4);
    let yScale = d3.scaleLinear().range([height, 0]);
    let colorScale = d3.scaleOrdinal<number, string>(d3.schemeCategory10)
                       .domain([0, 19]);
    let svg = d3.select(this.$.chart).append('svg')
        .attr('width', Math.max(SVG_MIN_WIDTH,
            xScaleRange + SVG_MARGIN.left + SVG_MARGIN.right))
        .attr('height', SVG_HEIGHT)
        .append('g')
        .attr('transform',
            'translate(' + SVG_MARGIN.left + ',' + SVG_MARGIN.top + ')');
    let stack = d3.stack().keys(stackKey).order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);
    const layers = stack(data);
    xScale.domain(data.map(this.xDomainFunc));
    yScale.domain([0, d3.max(layers[layers.length - 1], (d) => d[0] + d[1])])
        .nice();
    this.drawLayers(svg, layers, xScale, yScale, colorScale);
    this.drawAxes(svg, xScale, yScale, height);
    this.drawLegend(svg, stackLabel, colorScale);
  },
  /**
   * Draw the layers for all the bars.
   */
  drawLayers: function(svg: any, layers: any, xScale: any, yScale: any,
                       colorScale: any) {
    let parent = this;
    let layer = svg.selectAll('.layer').data(layers).enter().append('g')
        .attr('class', 'layer')
        .style('fill', (d, i) => colorScale(i));
    layer.selectAll('rect').data((d) => d).enter().append('rect')
        .attr('width', xScale.bandwidth())
        .attr('y', (d) => yScale(d[1]))
        .attr('height', (d) => yScale(d[0]) - yScale(d[1]))
        .attr('x', (d, i) => xScale(parent.xDomainFunc(d.data)))
        .on('mouseover',
            function(d) {
              d3.select(this).style('opacity', 0.5);
              parent.activeBar = d.data;
            })
        .on('mouseout',
            function(d) {
              d3.select(this).style('opacity', 1.0);
              parent.activeBar = null;
            });
  },
  /**
   * Draw the axes of the chart.
   */
  drawAxes: function(svg: any, xScale: any, yScale: any, height: number) {
    svg.append('g')
        .attr('class', 'axis axis--x')
        .style('font-size', FONT_SIZE)
        .attr('transform', 'translate(0,' + (height + 5) + ')')
        .call(d3.axisBottom(xScale));
    svg.append('g')
        .attr('class', 'axis axis--y')
        .style('font-size', FONT_SIZE)
        .attr('transform', 'translate(0,0)')
        .call(d3.axisLeft(yScale));
  },
  /**
   * Draw the legends of the chart.
   */
  drawLegend: function(svg: any, labels: Array<string>, colorScale: any) {
    let legend = svg.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', FONT_SIZE)
        .attr('text-anchor', 'start')
        .selectAll('g')
        .data(labels.slice())
        .enter()
        .append('g')
        .attr('transform',
            (d, i) => 'translate(' +
                (i * LEGEND_WIDTH -
                    Math.floor(i / LABELS_PER_LANE) * LEGEND_WIDTH *
                        LABELS_PER_LANE) + ',' +
                            Math.floor(i / LABELS_PER_LANE) *
                                LEGEND_HEIGHT + ')'
        );

    legend.append('rect')
        .attr('x', YAXIS_TO_LEGEND)
        .attr('width', ICON_SIZE)
        .attr('height', ICON_SIZE)
        .attr('fill', (d, i) => colorScale(i));
    legend.append('text')
        .attr('x', YAXIS_TO_LEGEND + LEGEND_MARGIN + ICON_SIZE)
        .attr('y', LEGEND_TEXT_HEIGHT)
        .attr('dy', LEGEND_TEXT_SIZE)
        .text((d) => d);
  },
  /**
   * Redraw the stack bar chart.
   */
  redraw: function(data: Array<any>) {
    if (!data || data.length == 0) return;
    this.stackBarChart(data);
  },
  /**
   * Redraws the stack bar chart when the stack elements changed.
   */
  _onStackLayersChanged:
      function(newData: Array<podviewer.proto.StackLayer>) {
    if (!newData || newData.length == 0) return;
    this.redraw(this.data);
  },
  /**
   * Redraws the stack bar chart when the input data changed.
   */
  _dataChanged: function(newData: Array<any>) {
    if (!newData || newData.length == 0) return;
    this.redraw(newData);
  },
  attached: function() {
    this.redraw(this.data);
  },
});

} // namespace pod_viewer_stack_bar_chart
