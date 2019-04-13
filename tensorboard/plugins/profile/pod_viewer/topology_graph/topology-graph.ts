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

namespace pod_viewer_topology_graph {

interface Position {
  x: number,
  y: number,
};

Polymer({
  is: 'topology-graph',
  properties: {
    data: {type: Object, value: null, observer: '_updateLinkData'},
    runEnvironment:
        {type: Object, observer: '_runEnvironmentChanged', value: null},
    metrics: {type: Array, notify: true, value: null},
    activeBar:
        {type: Object, notify: true, observer: '_activeBarChanged'},
    selectedChannel: {type: Array, notify: true},
    selectedMetricIdx: {type: Number, value: 0},
    selectedChannelId:
        {type: Number, value: 0, observer: '_selectedChannelIdChanged'},
    _topoData: {
      type: Object,
      computed: '_computeTopoData(data, runEnvironment, metrics, selectedMetricIdx)',
    },
    _linkData: {type: Object,},
    _tpuType: {type: String, observer: '_updateSystemInfo'},
    _hostXStride: {type: Number, value: 2},
    _hostYStride: {type: Number, value: 2},
    _nodesPerChip: {type: Number, value: 2},
    _hostGridWidth: {type: Number},
    _hostGridHeight: {type: Number},
    _chipGridSize: {type: Number, value: 30},
    _nodeGridHeight: {type: Number},
    _nodeGridWidth: {type: Number},
    _chipToChipMargin: {type: Number, value: 10},
    _hostToChipMargin: {type: Number, value: 15},
    _hostToHostMargin: {type: Number, value: 10},
    _xDimension: {type: Number},
    _yDimension: {type: Number},
    _totalCoreCount : {type: Number},
    _active: {type: Boolean, value: false},
    _allChannels: {type: Array, notify: true},
    _minChannelId: {type: Number, value: 0},
    _maxChannelId: {type: Number, value: 0},
    _gLink: {type: Object},
  },

  observers:
    ['updateTopology(_topoData, _active)'],

  /**
   * Computes the topoData to be loaded into the topology graph.
   */
  _computeTopoData: function(data, runEnvironment, metrics, idx) {
    if (!data || !runEnvironment || !runEnvironment.topology || !metrics ||
      idx >= metrics.length || idx < 0) {
      return;
    }
    const xdim = runEnvironment.topology.xDimension;
    return Object.keys(data.podStatsPerCore).map((core) => {
        const podStats = data.podStatsPerCore[core];
        return {
          xdim: podStats.chipId % xdim,
          ydim: Math.floor(podStats.chipId / xdim),
          nid: podStats.nodeId,
          cid: podStats.chipId,
          rid: data.coreIdToReplicaIdMap[core], // replica id.
          host: podStats.hostName,
          value: podStats[metrics[idx].key],
          total: podStats.totalDurationUs,
        };
    });
  },
  /**
   * Main function to draw topology graph based on TPU topology.
   */
  topologyGraph: function(data) {
    d3.select(this).selectAll('#tpgraph g > *').remove();
    d3.select(this).select('#tpgraph svg').remove();
    d3.select(this).select('#tpgraph.svg-container').remove();
    const margin = {top: 50, right: 0, bottom: 100, left: 30};
    const width = 1620;
    this._hostGridWidth = this.getHostGridSize(this._hostXStride);
    this._hostGridHeight = this.getHostGridSize(this._hostYStride);
    this._nodeGridWidth = this._chipGridSize / this._nodesPerChip;
    this._nodeGridHeight = this._chipGridSize;
    const hostXDim = this._xDimension / this._hostXStride;
    const hostYDim = this._yDimension / this._hostYStride;
    const colors = [
      '#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0',
      '#225ea8', '#253494', '#081d58'
    ];
    const colorScale =
        d3.scaleQuantile<string>().domain([0, 1.0]).range(colors);
    const chipXDims = Array.from(Array(this._xDimension).keys());
    const chipYDims = Array.from(Array(this._yDimension).keys());
    let svg =
        d3.select(this.$.tpgraph)
          .append('svg')
          .attr('width', width)
          .attr('height',
                hostYDim * this._hostGridHeight + margin.bottom + margin.top)
          .append('g')
          .attr('transform',
                'translate(' + margin.left + ',' + margin.top + ')');
    const hostData = this.createHostData(hostXDim, hostYDim);
    this.drawHostCards(
        svg, hostData, this._hostGridWidth, this._hostGridHeight,
        this._hostToHostMargin);
    this.drawNodeCards(svg, data, this._nodesPerChip, colorScale, colors);

    // Creates separate groups, so that the z-index remains in the right order.
    this._gLink = svg.append('svg:g').classed('link', true);

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
        this._hostGridHeight * Math.ceil(this._yDimension / this._hostYStride) +
        this._hostToHostMargin;
    this.drawLegend(svg, legendYLoc, this._chipGridSize, colorScale, colors);
  },
  /**
   * Returns the size of host grid, including the host card size and the margin
   * between two hosts.
   */
  getHostGridSize(stride: number): number {
    return this._hostToChipMargin * 2 + this._chipToChipMargin * (stride - 1) +
        this._chipGridSize * stride + this._hostToHostMargin;
  },
  /**
   * Returns the x-axis location for the xChip'th chip of the xHost'th host.
   */
  getChipXLoc: function(xHost: number, xChip: number): number {
    return xHost * this._hostGridWidth + this._hostToChipMargin +
        xChip * (this._chipGridSize + this._chipToChipMargin);
  },
  /**
   * Returns the y-axis location for the yChip'th chip of the yHost'th host.
   */
  getChipYLoc: function(yHost: number, yChip: number): number {
    return yHost * this._hostGridHeight + this._hostToChipMargin +
        yChip * (this._chipGridSize + this._chipToChipMargin);
  },
  /**
   * Returns the x-axis location for the xNode'th node of the xChip'th chip of
   * the xHost'th host.
   */
  getNodeXLoc: function(xHost: number, xChip: number, xNode: number): number {
    return this.getChipXLoc(xHost, xChip) + xNode * this._nodeGridWidth;
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
       .text(function(d) { return d; })
       .attr('x',
             (d, i) => parent.getChipXLoc(
                 Math.floor(i / this._hostXStride), i % this._hostXStride))
       .attr('y', 0)
       .style('text-anchor', 'middle')
       .attr('transform', 'translate(' + this._chipGridSize / 2 + ', -6)')
       .attr('class', 'axis');

    // Draw label on y axis.
    svg.selectAll('.yLabel')
       .data(ydims)
       .enter()
       .append('text')
       .text((d) => d)
       .attr('x', 0)
       .attr('y',
             (d, i) => parent.getChipYLoc(
                 Math.floor(i / this._hostYStride), i % this._hostYStride))
       .style('text-anchor', 'middle')
       .attr('transform', 'translate(-12,' + this._chipGridSize / 2 + ')')
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
         .attr('x', (d) => parent.getNodeXLoc(
                             Math.floor(d.xdim / parent._hostXStride),
                               d.xdim % parent._hostXStride, d.nid))
         .attr('y', (d) => parent.getChipYLoc(
                             Math.floor(d.ydim / parent._hostYStride),
                               d.ydim % parent._hostYStride))
         .attr('rx', 4 / nodesPerChip)
         .attr('ry', 4)
         .attr('class', 'hour bordered')
         .attr('width', parent._nodeGridWidth)
         .attr('height', parent._nodeGridHeight)
         .attr('border', border)
         .style('fill', colors[0])
         .style('stroke', borderColor)
         .style('stroke-width', border)
         .merge(cards)
         .on('mouseover',
             function(d) {
               // highlight text
               d3.select(this)
                 .classed('cell-hover', true)
                 .style('opacity', 0.5);

               // Update the tooltip position and value
               d3.select(parent.$.tooltip)
                 .style('left', d3.event.pageX + 10 + 'px')
                 .style('top', d3.event.pageY - 10 + 'px')
                 .select('#value')
                 .text(parent._getToolTipText(d));
               d3.select(parent.$.tooltip)
                 .classed('hidden', false);
             })
         .on('mouseout',
             function() {
               d3.select(this)
                 .classed('cell-hover', false)
                 .style('opacity', 1.0);
              d3.select(parent.$.tooltip).classed('hidden', true);
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
    if (!linkData || linkData.length == 0 || !this._gLink) {
      return;
    }

    // Handle links;
    let links = this._gLink.selectAll('.link').data(linkData);

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
    this._selectedChannelIdChanged(this.selectedChannelId);
  },
  /**
   * Given the global core id, returns the (x, y) coordinates in the topology
   * graph.
   */
  coreIdToPos: function(id: number): Position {
    let p = this;
    const chipId = Math.floor(id / 2);
    const nodeId = id & 1;
    const xDim = chipId % p._xDimension;
    const yDim = Math.floor(chipId / p._xDimension);
    const x =
        p.getNodeXLoc(
            Math.floor(xDim / p._hostXStride), xDim % p._hostXStride, nodeId) +
                p._chipGridSize / p._nodesPerChip / 2;
    const y = p.getChipYLoc(
                  Math.floor(yDim / p._hostYStride), yDim % p._hostYStride) +
                  p._chipGridSize / 2;
    return {x: x, y: y};
  },
  /**
   * Returns the svg path given the src and dst core and node id.
   * @return Path in svg format.
   */
  linkToPath: function(link): string {
    let p = this;
    const src = p.coreIdToPos(link.srcCoreId);
    const dst = p.coreIdToPos(link.dstCoreId);
    const path = 'M ' + src.x + ' ' + src.y + 'L ' + dst.x + ' ' + dst.y;
    return path;
  },
  /**
   * Returns the text to visualize in the tool tips.
   * @return String to render in tool tips.
   */
  _getToolTipText: function(data): string {
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
   * Updates the data to be rendered as links.
   */
  _updateLinkData: function(data) {
    if (!data || !data.channelDb || data.channelDb.length == 0) {
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
    this._linkData = links;
    this._minChannelId = min;
    this._maxChannelId = max;
  },
  /**
   * Updates the data to be rendered when run environment changed.
   */
  _runEnvironmentChanged: function(newData) {
    if (!newData || !newData.topology) {
      return;
    }
    this._tpuType = newData.tpuType;
    this._xDimension = parseInt(newData.topology.xDimension, 10);
    this._yDimension = parseInt(newData.topology.yDimension, 10);
    this._totalCoreCount =
      this._xDimension * this._yDimension * this._nodesPerChip;
  },
  /**
   * Updates the system info when the type of TPU changed.
   */
  _updateSystemInfo: function(tpuType: string) {
    if (!tpuType) {
      return;
    }
    switch (tpuType) {
      case 'TPU v2':
        this._hostXStride = 2;
        this._hostYStride = 2;
        this._nodesPerChip = 2;
        break;
      case 'TPU v3':
        this._hostXStride = 4;
        this._hostYStride = 2;
        this._nodesPerChip = 2;
        break;
      default:
        console.warn('TPU type: ', tpuType, 'is not supported by pod viewer.');
        break;
    }
  },
  /**
   * Redraws the graph when the data to be rendered changed.
   */
  updateTopology: function(newData, active) {
    if (!newData || !active) {
      return;
    }
    this.topologyGraph(newData);
    this.drawLinks(this.data.channelDb);
  },
  /**
   * Updates the visible links when the selectedChannelIdChanged.
   */
  _selectedChannelIdChanged: function(newData, oldData) {
    if (!this._linkData) {
      return;
    }
    if (this._linkData[oldData]) {
      d3.select(this).selectAll('#cid' + oldData).style('visibility', 'hidden');
    }
    if (this._linkData[newData]) {
      d3.select(this).selectAll('#cid' + newData)
        .style('visibility', 'visible');
      this.selectedChannel = this._linkData[newData];
    }
  },
  /**
   * Updates the topology color coding or selected channel id when the
   * activeBar changed.
   */
  _activeBarChanged: function(newData) {
    const colorScale = d3.scaleOrdinal<number, string>(d3.schemeCategory10)
                         .domain(d3.range(0, 19));
    if (!newData) { return; }
    if (newData.replicaGroups && newData.replicaGroups.length > 0) {
      // Colors the nodes within the same replica group to the same color.
      for (let i = 0; i < newData.replicaGroups.length; i++) {
        const group = newData.replicaGroups[i].replicaIds;
        for (let j = 0; j < group.length; j++) {
          d3.select(this).selectAll('#rid' + group[j])
            .style('fill', colorScale(i % 20));
        }
      }
      this.selectedMetricIdx = -1;
    } else if (newData.channelId) {
      this.selectedChannelId = newData.channelId;
    }
  },
  /**
   * Returns a label for the current metric selection.
   */
  _getSelectedMetricLabel: function(metrics, idx) {
    if (idx < 0 || !metrics || idx > metrics.length) {
      return 'Please select a metric';
    }
    return 'Color: ' + metrics[idx].label;
  },
  attached: function() {
    this._active = true;
  },
});

} // namespace pod_viewer_topology_graph
