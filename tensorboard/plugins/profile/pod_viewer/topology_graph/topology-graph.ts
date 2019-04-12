/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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

namespace pod_viewer_topology_graph {

Polymer({
  is: 'topology-graph',
  properties: {
    data_: {type: Object, value: null},
    runEnvironment_:
        {type: Object, observer: 'runEnvironmentChanged_', value: null},
    topoData_: {type: Object},
    linkData_: {type: Object},
    tpuType_: {type: String, observer: 'updateSystemInfo_'},
    hostXStride_: {type: Number, value: 2},
    hostYStride_: {type: Number, value: 2},
    nodesPerChip_: {type: Number, value: 2},
    hostGridWidth_: {type: Number},
    hostGridHeight_: {type: Number},
    chipGridSize_: {type: Number},
    nodeGridHeight_: {type: Number},
    nodeGridWidth_: {type: Number},
    chipToChipMargin_: {type: Number},
    hostToChipMargin_: {type: Number},
    hostToHostMargin_: {type: Number},
    xDimension_: {type: Number},
    yDimension_: {type: Number},
    totalCoreCount_ : {type: Number},
    ready_: {type: Boolean, value: false},
    metrics: {type: Array, notify: true, value: null},
    allChannels: {type: Array, notify: true},
    selectedChipId: {type: Number, notify: true},
    selectedMetricIdx: {type: Number, value: 0},
    selectedMetricLabel: {
      type: String,
      computed: 'getSelectedMetricLabel_(metrics, selectedMetricIdx)'
    },
    selectedChannelId:
        {type: Number, value: 0, observer: 'selectedChannelIdChanged_'},
    minChannelId: {type: Number, value: 0},
    maxChannelId: {type: Number, value: 0},
    gLink_: {type: Object},
    selectedChannel: {type: Array, notify: true},
    activeBarChartEle:
        {type: Object, notify: true, observer: 'activeBarChartEleChanged_'}
  },
  observers:
    ['updateAllData(data_, runEnvironment_, metrics, selectedMetricIdx)',
     'updateTopology(topoData_, ready_)',
     'updateLinks(linkData_, ready_)',
    ],
  /**
   * Main function to draw topology graph based on TPU topology.
   */
  topologyGraph: function(data) {
    d3.selectAll('#tpgraph g > *').remove();
    d3.select('#tpgraph svg').remove();
    d3.select('#tpgraph.svg-container').remove();
    const margin = {top: 50, right: 0, bottom: 100, left: 30};
    const width = 1620;
    this.chipGridSize_ = 30;
    this.chipToChipMargin_ = 10;
    this.hostToChipMargin_ = 15;
    this.hostToHostMargin_ = 10;
    this.hostGridWidth_ = this.getHostGridSize(this.hostXStride_);
    this.hostGridHeight_ = this.getHostGridSize(this.hostYStride_);
    this.nodeGridWidth_ = this.chipGridSize_ / this.nodesPerChip_;
    this.nodeGridHeight_ = this.chipGridSize_;
    const hostXDim = this.xDimension_ / this.hostXStride_;
    const hostYDim = this.yDimension_ / this.hostYStride_;
    const colors = [
      '#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0',
      '#225ea8', '#253494', '#081d58'
    ];
    const colorScale =
        d3.scaleQuantile<string>().domain([0, 1.0]).range(colors);
    const chipXDims = Array.from(Array(this.xDimension_).keys());
    const chipYDims = Array.from(Array(this.yDimension_).keys());
    let svg =
        d3.select('#tpgraph')
            .append('svg')
            .attr('width', width)
            .attr(
                'height',
                hostYDim * this.hostGridHeight_ + margin.bottom + margin.top)
            .append('g')
            .attr(
                'transform',
                'translate(' + margin.left + ',' + margin.top + ')');
    const hostData = this.createHostData(hostXDim, hostYDim);
    this.drawHostCards(
        svg, hostData, this.hostGridWidth_, this.hostGridHeight_,
        this.hostToHostMargin_);
    this.drawNodeCards(svg, data, this.nodesPerChip_, colorScale, colors);

    // Creates separate groups, so that the z-index remains in the right order.
    this.gLink_ = svg.append('svg:g').classed('link', true);

    // Add a svg:defs for the arrow head.
    svg.append('svg:defs')
        .append('svg:marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('svg:path')
        .style('stroke', 'red')
        .style('fill', 'red')
        .attr('d', 'M0,-5L10,0L0,5');
    this.drawLabels(svg, chipXDims, chipYDims);
    const legendYLoc =
        this.hostGridHeight_ * Math.ceil(this.yDimension_ / this.hostYStride_) +
        this.hostToHostMargin_;
    this.drawLegend(svg, legendYLoc, this.chipGridSize_, colorScale, colors);
  },
  /**
   * Returns the size of host grid, including the host card size and the margin
   * between two hosts.
   */
  getHostGridSize(stride: number): number {
    return this.hostToChipMargin_ * 2 + this.chipToChipMargin_ * (stride - 1) +
        this.chipGridSize_ * stride + this.hostToHostMargin_;
  },
  /**
   * Returns the x-axis location for the xChip'th chip of the xHost'th host.
   */
  getChipXLoc: function(xHost: number, xChip: number): number {
    return xHost * this.hostGridWidth_ + this.hostToChipMargin_ +
        xChip * (this.chipGridSize_ + this.chipToChipMargin_);
  },
  /**
   * Returns the y-axis location for the yChip'th chip of the yHost'th host.
   */
  getChipYLoc: function(yHost: number, yChip: number): number {
    return yHost * this.hostGridHeight_ + this.hostToChipMargin_ +
        yChip * (this.chipGridSize_ + this.chipToChipMargin_);
  },
  /**
   * Returns the x-axis location for the xNode'th node of the xChip'th chip of
   * the xHost'th host.
   */
  getNodeXLoc: function(xHost: number, xChip: number, xNode: number): number {
    return this.getChipXLoc(xHost, xChip) + xNode * this.nodeGridWidth_;
  },
  /**
   * Returns the location for each host in the system.
   */
  createHostData: function(hostXDim: number, hostYDim: number): any {
        let hostData = [];
        for (let i = 0; i < hostXDim; i++) {
          for (let j = 0; j < hostYDim; j++) {
            hostData.push({xdim: i, ydim: j});
          }
        }
        return hostData;
      },
  /**
   * Draw the labels on x-axis and y-axis.
   */
  drawLabels: function(svg, xdims: number[], ydims: number[]) {
    let parent = this;

    // Draw label on x axis.
    svg.selectAll('.xLabel')
        .data(xdims)
        .enter()
        .append('text')
        .text(function(d) {
          return d;
        })
        .attr(
            'x',
            (d, i) => parent.getChipXLoc(
                Math.floor(i / this.hostXStride_), i % this.hostXStride_))
        .attr('y', 0)
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(' + this.chipGridSize_ / 2 + ', -6)')
        .attr('class', 'axis');

    // Draw label on y axis.
    svg.selectAll('.yLabel')
        .data(ydims)
        .enter()
        .append('text')
        .text((d) => d)
        .attr('x', 0)
        .attr(
            'y',
            (d, i) => parent.getChipYLoc(
                Math.floor(i / this.hostYStride_), i % this.hostYStride_))
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(-12,' + this.chipGridSize_ / 2 + ')')
        .attr('class', 'axis');
  },
  /**
   * Draw the UI of host cards.
   */
  drawHostCards: function(
      svg, data, gridWidth: number,
      gridHeight: number, hostToHostMargin: number) {
    const border = 1;
    const borderColor = 'black';
    let cards = svg.selectAll('.xdim').data(data, (d) => d.xdim);
    cards.enter()
        .append('rect')
        .attr('x', (d) => d.xdim * gridWidth)
        .attr('y', (d) => d.ydim * gridHeight)
        .attr('rx', 4 * gridWidth / gridHeight)
        .attr('ry', 4)
        .attr('class', 'hour bordered')
        .attr('width', gridWidth - hostToHostMargin)
        .attr('height', gridHeight - hostToHostMargin)
        .attr('border', border)
        .style('fill', 'F0F0F0')
        .style('stroke', borderColor)
        .style('stroke-width', border)
        .merge(cards)
        .transition()
        .duration(1000);
    cards.exit().remove();
  },
  /**
   * Draw the UI of node cards.
   */
  drawNodeCards: function(
      svg, data, nodesPerChip, colorScale, colors) {
    let parent = this;
    const border = 1;
    const borderColor = 'black';
    let cards = svg.selectAll('.xdim').data(data, (d) => d.xdim);
    cards.enter()
        .append('rect')
        .attr('id', (d) => 'rid' + d.rid)
        .attr(
            'x',
            (d) => parent.getNodeXLoc(
                Math.floor(d.xdim / parent.hostXStride_),
                d.xdim % parent.hostXStride_, d.nid))
        .attr(
            'y',
            (d) => parent.getChipYLoc(
                Math.floor(d.ydim / parent.hostYStride_),
                d.ydim % parent.hostYStride_))
        .attr('rx', 4 / nodesPerChip)
        .attr('ry', 4)
        .attr('class', 'hour bordered')
        .attr('width', parent.nodeGridWidth_)
        .attr('height', parent.nodeGridHeight_)
        .attr('border', border)
        .style('fill', colors[0])
        .style('stroke', borderColor)
        .style('stroke-width', border)
        .merge(cards)
        .on('mouseover',
            function(d) {
              // highlight text
              d3.select(this).classed('cell-hover', true).style('opacity', 0.5);
              parent.selectedChipId = d.cid;

              // Update the tooltip position and value
              d3.select('#tooltip')
                  .style('left', d3.event.pageX + 10 + 'px')
                  .style('top', d3.event.pageY - 10 + 'px')
                  .select('#value')
                  .text(parent.getToolTipText_(d));
              d3.select('#tooltip')
                  .classed('hidden', false);
            })
        .on('mouseout',
            function() {
              parent.selectedChipId = -1;
              d3.select(this)
                  .classed('cell-hover', false)
                  .style('opacity', 1.0);
              d3.select('#tooltip').classed('hidden', true);
            })
        .transition()
        .duration(1000)
        .style('fill', (d) => colorScale(d.value / d.total));
    cards.exit().remove();
  },
  /**
   * Draw the UI of chip to chip links.
   */
  drawLinks: function(linkData) {
    let parent = this;
    if (!linkData || linkData.length == 0 || !this.gLink_) {
      return;
    }

    // Handle links;
    let links = this.gLink_.selectAll('.link').data(linkData);

    // attach the arrow from defs
    links.enter()
        .append('svg:path')
        .attr('id', (d) => 'cid' + d.channelId)
        .attr('stroke-width', 2)
        .attr('stroke', 'red')
        .attr('fill', 'none')
        .attr('marker-end', 'url(#arrow)')
        .style('visibility', 'hidden')
        .merge(links)
        .attr('d', (d) => parent.linkToPath(d));

    // Handle deleted links.
    links.exit().remove();
    this.selectedChannelIdChanged_(this.selectedChannelId);
  },
  /**
   * Given the global core id, returns the (x, y) coordinates in the topology
   * graph.
   * @return [x, y]
   */
  coreIdToPos: function(id: number): number[] {
    let p = this;
    const chipId = Math.floor(id / 2);
    const nodeId = id & 1;
    const xDim = chipId % p.xDimension_;
    const yDim = Math.floor(chipId / p.xDimension_);
    const x =
        p.getNodeXLoc(
            Math.floor(xDim / p.hostXStride_), xDim % p.hostXStride_, nodeId) +
        p.chipGridSize_ / p.nodesPerChip_ / 2;
    const y = p.getChipYLoc(
                  Math.floor(yDim / p.hostYStride_), yDim % p.hostYStride_) +
        p.chipGridSize_ / 2;
    return [x, y];
  },
  /**
   * Returns the svg path given the src and dst core and node id.
   * @return Path in svg format.
   */
  linkToPath: function(link): string {
    let p = this;
    const src = p.coreIdToPos(link.srcCoreId);
    const dst = p.coreIdToPos(link.dstCoreId);
    const path = 'M ' + src[0] + ' ' + src[1] + 'L ' + dst[0] + ' ' + dst[1];
    return path;
  },
  /**
   * Returns the text to visualize in the tool tips.
   * @return String to render in tool tips.
   */
  getToolTipText_: function(data): string {
    let parent = this;
    let res = 'pos: (' + data.ydim + ',' + data.xdim + ')\n';
    res += 'host: ' + data.host + '\n';
    res += 'chip id: ' + data.cid + '\n';
    res += 'node id: ' + data.nid + '\n';
    res += 'replica id: ' + data.rid + '\n';
    if (parent.selectedMetricIdx >= 0) {
      res += parent.metrics[parent.selectedMetricIdx].label + ' spends ' +
          data.value.toFixed(2) + 'us in total, ';
      const pcnt = data.value / data.total * 100;
      res += 'taking ' + pcnt.toFixed(2) + '% of a step.';
    }
    return res;
  },
  /**
   * Draw the legend of the graph.
   */
  drawLegend: function(
      svg: any, height: number, legendElementHeight: number,
      colorScale: any, colors: number[]) {
    const legendElementWidth = legendElementHeight * 2;
    let legend = svg.selectAll('.legend').data(
        [0].concat(colorScale.quantiles()), (d) => d);
    let legend_g = legend.enter().append('g').attr('class', 'legend');
    legend_g.append('rect')
        .attr('x', (d, i) => legendElementWidth * i)
        .attr('y', height)
        .attr('width', legendElementWidth)
        .attr('height', legendElementHeight)
        .style('fill', (d, i) => colors[i]);
    legend_g.append('text')
        .text((d) => '\u2265 0.' + Math.round(d * 10))
        .attr('x', (d, i) => legendElementWidth * i)
        .attr('y', height + legendElementHeight * 2);
    legend.exit().remove();
  },
  /**
   * Updates the data to be loaded into the topology graph.
   */
  updateAllData: function(
      data, runEnvironment, metrics, idx) {
    if (!data || !runEnvironment || !runEnvironment.topology || !metrics ||
        idx >= metrics.length || idx < 0) {
      return;
    }
    const xdim = runEnvironment.topology.xDimension;
    let result = [];

    Object.keys(data.podStatsPerCore).forEach(function(val) {
      const obj = data.podStatsPerCore[val];
      result.push({
        xdim: obj.chipId % xdim,
        ydim: Math.floor(obj.chipId / xdim),
        nid: obj.nodeId,
        cid: obj.chipId,
        rid: data.coreIdToReplicaIdMap[val], // replica id.
        host: obj.hostName,
        value: obj[metrics[idx].key],
        total: obj.totalDurationUs
      });
    });
    this.topoData_ = result;
    this.updateLinkData_(data);
  },
  /**
   * Updates the data to be rendered as links.
   */
  updateLinkData_: function(data) {
    if (!data.channelDb || data.channelDb.length == 0) {
      return;
    }
    let links = {};
    let min = data.channelDb[0].channelId;
    let max = 0;
    for (let i = 0; i < data.channelDb.length; i++) {
      const channel = data.channelDb[i];
      const cid = channel.channelId;
      if (!links[cid]) {
        links[cid] = [];
      }
      links[cid].push(channel);
      min = Math.min(cid, min);
      max = Math.max(cid, max);
    }
    this.linkData_ = links;
    this.minChannelId = min;
    this.maxChannelId = max;
  },
  /**
   * Updates the data to be rendered when run environment changed.
   */
  runEnvironmentChanged_: function(newData) {
    if (!newData || !newData.topology) {
      return;
    }
    this.tpuType_ = newData.tpuType;
    this.xDimension_ = parseInt(newData.topology.xDimension, 10);
    this.yDimension_ = parseInt(newData.topology.yDimension, 10);
    this.totalCoreCount_ =
      this.xDimension_ * this.yDimension_ * this.nodesPerChip_;
  },
  /**
   * Updates the system info when the type of TPU changed.
   */
  updateSystemInfo_: function(tpuType: string) {
    if (!tpuType) {
      return;
    }
    switch (tpuType) {
      case 'TPU v2':
        this.hostXStride_ = 2;
        this.hostYStride_ = 2;
        this.nodesPerChip_ = 2;
        break;
      case 'TPU v3':
        this.hostXStride_ = 4;
        this.hostYStride_ = 2;
        this.nodesPerChip_ = 2;
        break;
      default:
        console.warn('TPU type: ', tpuType, 'is not supported by pod viewer.');
        break;
    }
  },
  /**
   * Redraws the graph when the data to be rendered changed.
   */
  updateTopology: function(newData, ready) {
    if (!ready) {
      return;
    }
    this.topologyGraph(newData);
  },
  /**
   * Redraws the links when link data changed.
   */
  updateLinks: function(link, ready) {
    if (!ready || !link) return;
    this.drawLinks(this.data_.channelDb);
  },
  /**
   * Updates the visible links when the selectedChannelIdChanged.
   */
  selectedChannelIdChanged_: function(newData, oldData) {
    if (!this.linkData_) {
      return;
    }
    if (this.linkData_[oldData]) {
      d3.selectAll('#cid' + oldData).style('visibility', 'hidden');
    }
    if (this.linkData_[newData]) {
      d3.selectAll('#cid' + newData).style('visibility', 'visible');
      this.selectedChannel = this.linkData_[newData];
    }
  },
  /**
   * Updates the topology color coding when the activeBarChartEle changed.
   */
  activeBarChartEleChanged_: function(newData) {
    const colorScale = d3.scaleOrdinal<number, string>(d3.schemeCategory10)
                         .domain(d3.range(0, 19));
    if (!newData || !newData.replicaGroups || !newData.replicaGroups.length) {
      return;
    }
    // Colors the nodes within the same replica group to the same color.
    for (let i = 0; i < newData.replicaGroups.length; i++) {
      const group = newData.replicaGroups[i].replicaIds;
      for (let j = 0; j < group.length; j++) {
        d3.selectAll('#rid' + group[j])
          .style('fill', colorScale(i % 20));
      }
    }
    this.selectedMetricIdx = -1;
  },
  /**
   * Returns a label for the current metric selection.
   */
  getSelectedMetricLabel_: function(metrics, idx) {
    if (idx < 0 || !metrics || idx > metrics.length) {
      return 'Please select a metric';
    }
    return 'Color: ' + metrics[idx].label;
  },
  attached: function() {
    this.ready_ = true;
  }
});

} // namespace pod_viewer_topology_graph
