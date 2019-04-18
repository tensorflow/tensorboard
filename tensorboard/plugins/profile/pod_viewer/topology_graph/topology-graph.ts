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

const MAIN_COLORS = [
  '#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0',
  '#225ea8', '#253494', '#081d58'
];
const SVG_WIDTH = 1620;
const SVG_MARGIN = {top: 50, right: 0, bottom: 100, left: 30};

const CHIP_GRID_SIZE = 30;
const CHIP_TO_CHIP_MARGIN = 10;
const HOST_TO_CHIP_MARGIN = 15;
const HOST_TO_HOST_MARGIN = 10;

const HOST_Y_STRIDE = 2;
const NODES_PER_CHIP = 2;

interface Position {
  x: number,
  y: number,
};

/** Data to render in the node cards. */
interface TopoData {
  /** Index on x-dimension. */
  xdim: number,
  /** Index on y-dimension. */
  ydim: number,
  /** Node id. */
  nid: number,
  /** Chip id. */
  cid: number,
  /** Replica id. */
  rid: number,
  /** Host name. */
  host: string,
  /** Value of the selected metric. */
  value: number,
  /** Step total duration. */
  total: number,
};

/** Data to render in the host cards. */
interface HostData {
  /** Index on x-dimension. */
  xdim: number,
  /** Index on y-dimension. */
  ydim: number,
};

/** Links grouped by channel id. */
interface LinkData {
  [key: number]: Array<podviewer.proto.ChannelInfo>
};

Polymer({
  is: 'topology-graph',
  properties: {
    data: {
      type: Object,
    },
    runEnvironment: {
      type: Object,
    },
    metrics: {
      type: Array,
      value: () => [],
    },
    activeBar:{
      type: Object,
      observer: '_activeBarChanged',
    },
    selectedChannel: {
      type: Array,
      notify: true,
    },
    selectedMetricIdx: {
      type: Number,
      value: 0,
    },
    selectedChannelId: {
      type: Number,
      value: 0,
      observer: '_selectedChannelIdChanged',
    },
    _topoData: {
      type: Object,
      computed:
          '_computeTopoData(data, runEnvironment, metrics, selectedMetricIdx)',
    },
    _linkData: {
      type: Object,
      computed: '_computeLinkData(data)',
    },
    _minChannelId: {
      type: Number,
      computed: '_computeMinChannelId(data)',
    },
    _maxChannelId: {
      type: Number,
      value: 0,
      computed: '_computeMaxChannelId(data)',
    },
    _xDimension: {
      type: Number,
      computed: '_computeXDimension(runEnvironment)',
    },
    _yDimension: {
      type: Number,
      computed: '_computeYDimension(runEnvironment)',
    },
    _totalCoreCount: {
      type: Number,
      computed: '_computeTotalCoreCount(_xDimension, _yDimension)',
    },
    _tpuType: {
      type: String,
      computed: '_computeTpuType(runEnvironment)',
    },
    _hostXStride: {
      type: Number,
      computed: '_computeHostXStride(_tpuType)',
    },
    _hostGridWidth: {
      type: Number,
    },
    _hostGridHeight: {
      type: Number,
    },
    _nodeGridHeight: {
      type: Number,
    },
    _nodeGridWidth: {
      type: Number,
    },
    _gLink: {
      type: Object,
    },
  },
  observers: ['drawTopology(_topoData, runEnvironment)'],
  /**
   * Computes the topoData to be loaded into the topology graph.
   */
  _computeTopoData: function(
      data: podviewer.proto.PodStatsMap | undefined,
      runEnvironment: podviewer.proto.RunEnvironment | undefined,
      metrics: Array<podviewer.proto.StackLayer>,
      idx: number): Array<TopoData> {
    if (!data || !runEnvironment || !runEnvironment.topology || !metrics ||
        idx >= metrics.length || idx < 0) {
      return;
    }
    const xdim = parseInt(runEnvironment.topology.xDimension, 10);
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
   * Compute the data to be rendered as links.
   */
  _computeLinkData: function(
      data: podviewer.proto.PodStatsMap): LinkData {
    if (!data || !data.channelDb || data.channelDb.length == 0) return;
    let links = {};
    data.channelDb.forEach(function(channel) {
      if (!links[channel.channelId]) {
        links[channel.channelId] = [channel];
      } else {
        links[channel.channelId].push(channel);
      }
    });
    return links;
  },
  /** Compute the min channel id.*/
  _computeMinChannelId: function(
    data: podviewer.proto.PodStatsMap): number {
    if (!data || !data.channelDb || data.channelDb.length == 0) {
      return;
    }
    return data.channelDb.reduce(
        (min, p) => Math.min(min, p.channelId), data.channelDb[0].channelId);
  },
  /** Compute the max channel id.*/
  _computeMaxChannelId: function(
    data: podviewer.proto.PodStatsMap): number {
    if (!data || !data.channelDb || data.channelDb.length == 0) {
      return;
    }
    return data.channelDb.reduce(
        (max, p) => Math.max(max, p.channelId), data.channelDb[0].channelId);
  },
  _computeTpuType: function(env: podviewer.proto.RunEnvironment): string {
    if (!env) return;
    return env.tpuType;
  },
  _computeXDimension: function(env: podviewer.proto.RunEnvironment): number {
    if (!env || !env.topology) return;
    return parseInt(env.topology.xDimension, 10);
  },
  _computeYDimension: function(env: podviewer.proto.RunEnvironment): number {
    if (!env || !env.topology) return;
    return parseInt(env.topology.yDimension, 10);
  },
  _computeTotalCoreCount: function(xdim: number, ydim: number): number {
    return xdim * ydim * NODES_PER_CHIP;
  },
  _computeHostXStride: function(tpuType: string): number {
    return tpuType == 'TPU v3' ? 4 : 2;
  },
  /**
   * Main function to draw topology graph based on TPU topology.
   */
  topologyGraph: function(data: Array<TopoData>) {
    d3.select(this.$.tpgraph).selectAll('g > *').remove();
    d3.select(this.$.tpgraph).select('svg').remove();
    d3.select(this.$.tpgraph).select('.svg-container').remove();
    this._hostGridWidth = this.getHostGridSize(this._hostXStride);
    this._hostGridHeight = this.getHostGridSize(HOST_Y_STRIDE);
    this._nodeGridWidth = CHIP_GRID_SIZE / NODES_PER_CHIP;
    this._nodeGridHeight = CHIP_GRID_SIZE;
    const hostXDim = this._xDimension / this._hostXStride;
    const hostYDim = this._yDimension / HOST_Y_STRIDE;
    const colorScale =
        d3.scaleQuantile<string>().domain([0, 1.0]).range(MAIN_COLORS);
    const chipXDims = Array.from(Array(this._xDimension).keys());
    const chipYDims = Array.from(Array(this._yDimension).keys());
    let svg = d3.select(this.$.tpgraph)
        .append('svg')
        .attr('width', SVG_WIDTH)
        .attr('height', hostYDim * this._hostGridHeight
            + SVG_MARGIN.bottom + SVG_MARGIN.top)
        .append('g')
        .attr('transform',
            'translate(' + SVG_MARGIN.left + ',' + SVG_MARGIN.top + ')');
    const hostData = this.createHostData(hostXDim, hostYDim);
    this.drawHostCards(
        svg, hostData, this._hostGridWidth, this._hostGridHeight);
    this.drawNodeCards(svg, data, colorScale);

    // Creates separate groups, so that the z-index remains in the right order.
    this._gLink = svg.append('svg:g').classed('link', true);

    // Add a svg:defs for the arrow head.
    svg.append('svg:defs').append('svg:marker')
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
        this._hostGridHeight * Math.ceil(this._yDimension / HOST_Y_STRIDE) +
        HOST_TO_HOST_MARGIN;
    this.drawLegend(svg, legendYLoc, colorScale);
  },
  /**
   * Returns the size of host grid, including the host card size and the margin
   * between two hosts.
   */
  getHostGridSize(stride: number): number {
    return HOST_TO_CHIP_MARGIN * 2 + CHIP_TO_CHIP_MARGIN * (stride - 1) +
        CHIP_GRID_SIZE * stride + HOST_TO_HOST_MARGIN;
  },
  /**
   * Returns the x-axis location for the xChip'th chip of the xHost'th host.
   */
  getChipXLoc: function(xHost: number, xChip: number): number {
    return xHost * this._hostGridWidth + HOST_TO_CHIP_MARGIN +
        xChip * (CHIP_GRID_SIZE + CHIP_TO_CHIP_MARGIN);
  },
  /**
   * Returns the y-axis location for the yChip'th chip of the yHost'th host.
   */
  getChipYLoc: function(yHost: number, yChip: number): number {
    return yHost * this._hostGridHeight + HOST_TO_CHIP_MARGIN +
        yChip * (CHIP_GRID_SIZE + CHIP_TO_CHIP_MARGIN);
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
  createHostData: function(
      hostXDim: number, hostYDim: number): Array<HostData> {
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
  drawLabels: function(svg: any, xdims: number[], ydims: number[]) {
    let parent = this;

    // Draw label on x axis.
    svg.selectAll('.xLabel').data(xdims).enter().append('text').text((d) => d)
        .attr('x', (d, i) => parent.getChipXLoc(
                       Math.floor(i / parent._hostXStride),
                           i % parent._hostXStride))
        .attr('y', 0)
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(' + CHIP_GRID_SIZE / 2 + ', -6)')
        .attr('class', 'axis');

    // Draw label on y axis.
    svg.selectAll('.yLabel').data(ydims).enter().append('text').text((d) => d)
        .attr('x', 0)
        .attr('y', (d, i) => parent.getChipYLoc(
                       Math.floor(i / HOST_Y_STRIDE), i % HOST_Y_STRIDE))
       .style('text-anchor', 'middle')
       .attr('transform', 'translate(-12,' + CHIP_GRID_SIZE / 2 + ')')
       .attr('class', 'axis');
  },
  /**
   * Draw the UI of host cards.
   */
  drawHostCards: function(svg, data, gridWidth: number, gridHeight: number) {
    let cards = svg.selectAll('.xdim').data(data, (d) => d.xdim);
    cards.enter().append('rect')
        .attr('x', (d) => d.xdim * gridWidth)
        .attr('y', (d) => d.ydim * gridHeight)
        .attr('rx', 4 * gridWidth / gridHeight)
        .attr('ry', 4)
        .attr('class', 'hour bordered')
        .attr('width', gridWidth - HOST_TO_HOST_MARGIN)
        .attr('height', gridHeight - HOST_TO_HOST_MARGIN)
        .attr('border', 1)
        .style('fill', 'F0F0F0')
        .style('stroke', 'black')
        .style('stroke-width', 1)
        .merge(cards)
        .transition()
        .duration(1000);
    cards.exit().remove();
  },
  /**
   * Draw the UI of node cards.
   */
  drawNodeCards: function(svg: any, data: Array<TopoData>, colorScale: any) {
    let parent = this;
    let cards = svg.selectAll('.xdim').data(data, (d) => d.xdim);
    cards.enter().append('rect')
        .attr('id', (d) => 'rid' + d.rid)
        .attr('x', (d) => parent.getNodeXLoc(
                              Math.floor(d.xdim / parent._hostXStride),
                                  d.xdim % parent._hostXStride, d.nid))
        .attr('y', (d) => parent.getChipYLoc(
                              Math.floor(d.ydim / HOST_Y_STRIDE),
                                  d.ydim % HOST_Y_STRIDE))
        .attr('rx', 4 / NODES_PER_CHIP)
        .attr('ry', 4)
        .attr('class', 'hour bordered')
        .attr('width', parent._nodeGridWidth)
        .attr('height', parent._nodeGridHeight)
        .attr('border', 1)
        .style('stroke', 'black')
        .style('stroke-width', 1)
        .style('fill', (d) => colorScale(d.value / d.total))
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
               d3.select(this).classed('cell-hover', false)
                   .style('opacity', 1.0);
              d3.select(parent.$.tooltip).classed('hidden', true);
             });
    cards.exit().remove();
  },
  /**
   * Draw the UI of chip to chip links.
   */
   drawLinks: function(linkData: Array<podviewer.proto.ChannelInfo>) {
    let parent = this;
    if (!linkData || linkData.length == 0 || !this._gLink) {
      return;
    }

    // Handle links;
    let links = this._gLink.selectAll('.link').data(linkData);

    // attach the arrow from defs
    links.enter().append('svg:path')
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
                CHIP_GRID_SIZE / NODES_PER_CHIP / 2;
    const y = p.getChipYLoc(
                  Math.floor(yDim / HOST_Y_STRIDE), yDim % HOST_Y_STRIDE) +
                  CHIP_GRID_SIZE / 2;
    return {x: x, y: y};
  },
  /**
   * Returns the svg path given the src and dst core and node id.
   * @return Path in svg format.
   */
  linkToPath: function(link: podviewer.proto.ChannelInfo): string {
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
  _getToolTipText: function(data: TopoData): string {
    let parent = this;
    let res = 'pos: (' + data.ydim + ',' + data.xdim + ')\n';
    res += 'host: ' + data.host + '\n';
    res += 'chip id: ' + data.cid + '\n';
    res += 'node id: ' + data.nid + '\n';
    res += 'replica id: ' + data.rid + '\n';
    if (parent.selectedMetricIdx >= 0) {
      res += parent.metrics[parent.selectedMetricIdx].label + ' spends ' +
          data.value.toFixed(2) + ' µs in total, ';
      const pcnt = data.value / data.total * 100;
      res += 'taking ' + pcnt.toFixed(2) + '% of a step.';
    }
    return res;
  },
  /**
   * Draw the legend of the graph.
   */
  drawLegend: function(svg: any, height: number, colorScale: any) {
    const legendElementWidth = CHIP_GRID_SIZE * 2;
    let legend = svg.selectAll('.legend').data(
        [0].concat(colorScale.quantiles()), (d) => d);
    let legend_g = legend.enter().append('g').attr('class', 'legend');
    legend_g.append('rect')
        .attr('x', (d, i) => legendElementWidth * i)
        .attr('y', height)
        .attr('width', legendElementWidth)
        .attr('height', CHIP_GRID_SIZE)
        .style('fill', (d, i) => MAIN_COLORS[i]);
    legend_g.append('text')
        .text((d) => '\u2265 0.' + Math.round(d * 10))
        .attr('x', (d, i) => legendElementWidth * i)
        .attr('y', height + CHIP_GRID_SIZE * 2);
    legend.exit().remove();
  },
  /**
   * Redraws the graph when the data to be rendered changed.
   */
  drawTopology: function(
      topoData: Array<TopoData>,
      runEnvironment: podviewer.proto.RunEnvironment) {
    if (!topoData || !runEnvironment || !this.isAttached) {
      return;
    }
    this.topologyGraph(topoData);
    this.drawLinks(this.data.channelDb);
  },
  attached: function() {
    this.drawTopology(this._topoData, this.runEnvironment);
  },
  /**
   * Updates the visible links when the selectedChannelIdChanged.
   */
  _selectedChannelIdChanged: function(newData: number, oldData: number) {
    if (!this._linkData) return;
    if (this._linkData[oldData]) {
      d3.select(this.$.tpgraph)
          .selectAll('#cid' + oldData).style('visibility', 'hidden');
    }
    if (this._linkData[newData]) {
      d3.select(this.$.tpgraph)
          .selectAll('#cid' + newData).style('visibility', 'visible');
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
    if (!newData) return;
    if (newData.replicaGroups && newData.replicaGroups.length > 0) {
      // Colors the nodes within the same replica group to the same color.
      for (let i = 0; i < newData.replicaGroups.length; i++) {
        const group = newData.replicaGroups[i].replicaIds;
        for (let j = 0; j < group.length; j++) {
          d3.select(this.$.tpgraph).selectAll('#rid' + group[j])
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
  _getSelectedMetricLabel: function(
    metrics: Array<podviewer.proto.StackLayer>, idx:number): string {
    if (idx < 0 || !metrics || idx > metrics.length) {
      return 'Please select a metric';
    }
    return 'Color: ' + metrics[idx].label;
  },
});

} // namespace pod_viewer_topology_graph
