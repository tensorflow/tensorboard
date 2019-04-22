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
var pod_viewer_topology_graph;
(function (pod_viewer_topology_graph) {
    var MAIN_COLORS = [
        '#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0',
        '#225ea8', '#253494', '#081d58'
    ];
    var SVG_WIDTH = 1620;
    var SVG_MARGIN = { top: 50, right: 0, bottom: 100, left: 30 };
    var CHIP_GRID_SIZE = 30;
    var CHIP_TO_CHIP_MARGIN = 10;
    var HOST_TO_CHIP_MARGIN = 15;
    var HOST_TO_HOST_MARGIN = 10;
    var HOST_Y_STRIDE = 2;
    var NODES_PER_CHIP = 2;
    ;
    ;
    ;
    ;
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
                value: function () { return []; },
            },
            activeBar: {
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
                computed: '_computeTopoData(data, runEnvironment, metrics, selectedMetricIdx)',
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
        _computeTopoData: function (data, runEnvironment, metrics, idx) {
            if (!data || !runEnvironment || !runEnvironment.topology || !metrics ||
                idx >= metrics.length || idx < 0) {
                return;
            }
            var xdim = parseInt(runEnvironment.topology.xDimension, 10);
            return Object.keys(data.podStatsPerCore).map(function (core) {
                var podStats = data.podStatsPerCore[core];
                return {
                    xdim: podStats.chipId % xdim,
                    ydim: Math.floor(podStats.chipId / xdim),
                    nid: podStats.nodeId,
                    cid: podStats.chipId,
                    rid: data.coreIdToReplicaIdMap[core],
                    host: podStats.hostName,
                    value: podStats[metrics[idx].key],
                    total: podStats.totalDurationUs,
                };
            });
        },
        /**
         * Compute the data to be rendered as links.
         */
        _computeLinkData: function (data) {
            if (!data || !data.channelDb || data.channelDb.length == 0)
                return {};
            var links = {};
            data.channelDb.forEach(function (channel) {
                if (!links[channel.channelId]) {
                    links[channel.channelId] = [channel];
                }
                else {
                    links[channel.channelId].push(channel);
                }
            });
            return links;
        },
        /** Compute the min channel id.*/
        _computeMinChannelId: function (data) {
            if (!data || !data.channelDb || data.channelDb.length == 0) {
                return;
            }
            return data.channelDb.reduce(function (min, p) { return Math.min(min, p.channelId); }, data.channelDb[0].channelId);
        },
        /** Compute the max channel id.*/
        _computeMaxChannelId: function (data) {
            if (!data || !data.channelDb || data.channelDb.length == 0) {
                return;
            }
            return data.channelDb.reduce(function (max, p) { return Math.max(max, p.channelId); }, data.channelDb[0].channelId);
        },
        _computeTpuType: function (env) {
            if (!env)
                return;
            return env.tpuType;
        },
        _computeXDimension: function (env) {
            if (!env || !env.topology)
                return;
            return parseInt(env.topology.xDimension, 10);
        },
        _computeYDimension: function (env) {
            if (!env || !env.topology)
                return;
            return parseInt(env.topology.yDimension, 10);
        },
        _computeTotalCoreCount: function (xdim, ydim) {
            return xdim * ydim * NODES_PER_CHIP;
        },
        _computeHostXStride: function (tpuType) {
            return tpuType == 'TPU v3' ? 4 : 2;
        },
        /**
         * Main function to draw topology graph based on TPU topology.
         */
        topologyGraph: function (data) {
            d3.select(this.$.tpgraph).selectAll('g > *').remove();
            d3.select(this.$.tpgraph).select('svg').remove();
            d3.select(this.$.tpgraph).select('.svg-container').remove();
            this._hostGridWidth = this.getHostGridSize(this._hostXStride);
            this._hostGridHeight = this.getHostGridSize(HOST_Y_STRIDE);
            this._nodeGridWidth = CHIP_GRID_SIZE / NODES_PER_CHIP;
            this._nodeGridHeight = CHIP_GRID_SIZE;
            var hostXDim = this._xDimension / this._hostXStride;
            var hostYDim = this._yDimension / HOST_Y_STRIDE;
            var colorScale = d3.scaleQuantile().domain([0, 1.0]).range(MAIN_COLORS);
            var chipXDims = Array.from(Array(this._xDimension).keys());
            var chipYDims = Array.from(Array(this._yDimension).keys());
            var svg = d3.select(this.$.tpgraph)
                .append('svg')
                .attr('width', SVG_WIDTH)
                .attr('height', hostYDim * this._hostGridHeight
                + SVG_MARGIN.bottom + SVG_MARGIN.top)
                .append('g')
                .attr('transform', 'translate(' + SVG_MARGIN.left + ',' + SVG_MARGIN.top + ')');
            var hostData = this.createHostData(hostXDim, hostYDim);
            this.drawHostCards(svg, hostData, this._hostGridWidth, this._hostGridHeight);
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
            var legendYLoc = this._hostGridHeight * Math.ceil(this._yDimension / HOST_Y_STRIDE) +
                HOST_TO_HOST_MARGIN;
            this.drawLegend(svg, legendYLoc, colorScale);
        },
        /**
         * Returns the size of host grid, including the host card size and the margin
         * between two hosts.
         */
        getHostGridSize: function (stride) {
            return HOST_TO_CHIP_MARGIN * 2 + CHIP_TO_CHIP_MARGIN * (stride - 1) +
                CHIP_GRID_SIZE * stride + HOST_TO_HOST_MARGIN;
        },
        /**
         * Returns the x-axis location for the xChip'th chip of the xHost'th host.
         */
        getChipXLoc: function (xHost, xChip) {
            return xHost * this._hostGridWidth + HOST_TO_CHIP_MARGIN +
                xChip * (CHIP_GRID_SIZE + CHIP_TO_CHIP_MARGIN);
        },
        /**
         * Returns the y-axis location for the yChip'th chip of the yHost'th host.
         */
        getChipYLoc: function (yHost, yChip) {
            return yHost * this._hostGridHeight + HOST_TO_CHIP_MARGIN +
                yChip * (CHIP_GRID_SIZE + CHIP_TO_CHIP_MARGIN);
        },
        /**
         * Returns the x-axis location for the xNode'th node of the xChip'th chip of
         * the xHost'th host.
         */
        getNodeXLoc: function (xHost, xChip, xNode) {
            return this.getChipXLoc(xHost, xChip) + xNode * this._nodeGridWidth;
        },
        /**
         * Returns the location for each host in the system.
         */
        createHostData: function (hostXDim, hostYDim) {
            var hostData = [];
            for (var i = 0; i < hostXDim; i++) {
                for (var j = 0; j < hostYDim; j++) {
                    hostData.push({ xdim: i, ydim: j });
                }
            }
            return hostData;
        },
        /**
         * Draw the labels on x-axis and y-axis.
         */
        drawLabels: function (svg, xdims, ydims) {
            var _this = this;
            // Draw label on x axis.
            var xLabel = svg.selectAll('.xLabel').data(xdims);
            xLabel.enter().append('text').merge(xLabel)
                .text(function (d) { return d; })
                .attr('x', function (d, i) { return _this.getChipXLoc(Math.floor(i / _this._hostXStride), i % _this._hostXStride); })
                .attr('y', 0)
                .style('text-anchor', 'middle')
                .attr('transform', 'translate(' + CHIP_GRID_SIZE / 2 + ', -6)')
                .attr('class', 'axis');
            // Draw label on y axis.
            var yLabel = svg.selectAll('.yLabel').data(ydims);
            yLabel.enter().append('text').merge(yLabel)
                .text(function (d) { return d; })
                .attr('x', 0)
                .attr('y', function (d, i) { return _this.getChipYLoc(Math.floor(i / HOST_Y_STRIDE), i % HOST_Y_STRIDE); })
                .style('text-anchor', 'middle')
                .attr('transform', 'translate(-12,' + CHIP_GRID_SIZE / 2 + ')')
                .attr('class', 'axis');
        },
        /**
         * Draw the UI of host cards.
         */
        drawHostCards: function (svg, data, gridWidth, gridHeight) {
            var cards = svg.selectAll('.xdim').data(data, function (d) { return d.xdim; });
            cards.enter().append('rect').merge(cards)
                .attr('x', function (d) { return d.xdim * gridWidth; })
                .attr('y', function (d) { return d.ydim * gridHeight; })
                .attr('rx', 4 * gridWidth / gridHeight)
                .attr('ry', 4)
                .attr('class', 'hour bordered')
                .attr('width', gridWidth - HOST_TO_HOST_MARGIN)
                .attr('height', gridHeight - HOST_TO_HOST_MARGIN)
                .attr('border', 1)
                .style('fill', 'F0F0F0')
                .style('stroke', 'black')
                .style('stroke-width', 1)
                .transition()
                .duration(1000);
            cards.exit().remove();
        },
        /**
         * Draw the UI of node cards.
         */
        drawNodeCards: function (svg, data, colorScale) {
            var _this = this;
            var cards = svg.selectAll('.xdim').data(data, function (d) { return d.xdim; });
            var parent = this;
            cards.enter().append('rect').merge(cards)
                .attr('id', function (d) { return 'rid' + d.rid; })
                .attr('x', function (d) {
                return _this.getNodeXLoc(Math.floor(d.xdim / _this._hostXStride), d.xdim % _this._hostXStride, d.nid);
            })
                .attr('y', function (d) {
                return _this.getChipYLoc(Math.floor(d.ydim / HOST_Y_STRIDE), d.ydim % HOST_Y_STRIDE);
            })
                .attr('rx', 4 / NODES_PER_CHIP)
                .attr('ry', 4)
                .attr('class', 'hour bordered')
                .attr('width', this._nodeGridWidth)
                .attr('height', this._nodeGridHeight)
                .attr('border', 1)
                .style('stroke', 'black')
                .style('stroke-width', 1)
                .style('fill', function (d) { return colorScale(d.value / d.total); })
                .on('mouseover', function (d) {
                // highlight text
                d3.select(this).classed('cell-hover', true).style('opacity', 0.5);
                // Update the tooltip position and value
                d3.select(parent.$.tooltip)
                    .style('left', d3.event.pageX + 10 + 'px')
                    .style('top', d3.event.pageY - 10 + 'px')
                    .select('#value')
                    .text(parent._getToolTipText(d));
                d3.select(parent.$.tooltip).classed('hidden', false);
            })
                .on('mouseout', function () {
                d3.select(this).classed('cell-hover', false).style('opacity', 1.0);
                d3.select(parent.$.tooltip).classed('hidden', true);
            });
            cards.exit().remove();
        },
        /**
         * Draw the UI of chip to chip links.
         */
        drawLinks: function (linkData) {
            var _this = this;
            if (!linkData || linkData.length == 0 || !this._gLink) {
                return;
            }
            // Handle links;
            var links = this._gLink.selectAll('.link').data(linkData);
            // attach the arrow from defs
            links.enter().append('svg:path').merge(links)
                .attr('id', function (d) { return 'cid' + d.channelId; })
                .attr('stroke-width', 2)
                .attr('stroke', 'red')
                .attr('fill', 'none')
                .attr('marker-end', 'url(#arrow)')
                .style('visibility', 'hidden')
                .attr('d', function (d) { return _this.linkToPath(d); });
            // Handle deleted links.
            links.exit().remove();
            this._selectedChannelIdChanged(this.selectedChannelId);
        },
        /**
         * Given the global core id, returns the (x, y) coordinates in the topology
         * graph.
         */
        coreIdToPos: function (id) {
            var chipId = Math.floor(id / 2);
            var nodeId = id & 1;
            var xDim = chipId % this._xDimension;
            var yDim = Math.floor(chipId / this._xDimension);
            var x = CHIP_GRID_SIZE / NODES_PER_CHIP / 2 +
                this.getNodeXLoc(Math.floor(xDim / this._hostXStride), xDim % this._hostXStride, nodeId);
            var y = this.getChipYLoc(Math.floor(yDim / HOST_Y_STRIDE), yDim % HOST_Y_STRIDE)
                + CHIP_GRID_SIZE / 2;
            return { x: x, y: y };
        },
        /**
         * Returns the svg path given the src and dst core and node id.
         * @return Path in svg format.
         */
        linkToPath: function (link) {
            var src = this.coreIdToPos(link.srcCoreId);
            var dst = this.coreIdToPos(link.dstCoreId);
            var path = 'M ' + src.x + ' ' + src.y + 'L ' + dst.x + ' ' + dst.y;
            return path;
        },
        /**
         * Returns the text to visualize in the tool tips.
         * @return String to render in tool tips.
         */
        _getToolTipText: function (data) {
            var label = this.selectedMetricIdx >= 0 ?
                this.metrics[this.selectedMetricIdx].label : '';
            var nf = new Intl.NumberFormat(navigator.language, { style: 'percent', minimumFractionDigits: 2 });
            var res = "pos: (" + data.ydim + ", " + data.xdim + "),\n        host: " + data.host + ",\n        chip id: " + data.cid + ",\n        core id: " + data.nid + ",\n        replica id: " + data.rid + "\n        " + (label ? label + " spends " + data.value.toFixed(2) + "\u00B5s in total,\n            taking " + nf.format(data.value / data.total) + " of a step." : '');
            return res;
        },
        /**
         * Draw the legend of the graph.
         */
        drawLegend: function (svg, height, colorScale) {
            var legendElementWidth = CHIP_GRID_SIZE * 2;
            var legend = svg.selectAll('.legend').data([0].concat(colorScale.quantiles()), function (d) { return d; });
            var legendG = legend.enter().append('g').merge(legend)
                .attr('class', 'legend');
            legendG.append('rect')
                .attr('x', function (d, i) { return legendElementWidth * i; })
                .attr('y', height)
                .attr('width', legendElementWidth)
                .attr('height', CHIP_GRID_SIZE)
                .style('fill', function (d, i) { return MAIN_COLORS[i]; });
            legendG.append('text')
                .text(function (d) { return '\u2265 0.' + Math.round(d * 10); })
                .attr('x', function (d, i) { return legendElementWidth * i; })
                .attr('y', height + CHIP_GRID_SIZE * 2);
            legend.exit().remove();
        },
        /**
         * Redraws the graph when the data to be rendered changed.
         */
        drawTopology: function (topoData, runEnvironment) {
            if (!topoData || !runEnvironment || !this.isAttached) {
                return;
            }
            this.topologyGraph(topoData);
            this.drawLinks(this.data.channelDb);
        },
        attached: function () {
            this.drawTopology(this._topoData, this.runEnvironment);
        },
        /**
         * Updates the visible links when the selectedChannelIdChanged.
         */
        _selectedChannelIdChanged: function (newData, oldData) {
            if (!this._linkData)
                return;
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
        _activeBarChanged: function (newData) {
            var colorScale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain(d3.range(0, 19));
            if (!newData)
                return;
            if (newData.replicaGroups && newData.replicaGroups.length > 0) {
                // Colors the nodes within the same replica group to the same color.
                for (var i = 0; i < newData.replicaGroups.length; i++) {
                    var group = newData.replicaGroups[i].replicaIds;
                    for (var j = 0; j < group.length; j++) {
                        d3.select(this.$.tpgraph).selectAll('#rid' + group[j])
                            .style('fill', colorScale(i % 20));
                    }
                }
                this.selectedMetricIdx = -1;
            }
            else if (newData.channelId) {
                this.selectedChannelId = newData.channelId;
            }
        },
        /**
         * Returns a label for the current metric selection.
         */
        _getSelectedMetricLabel: function (metrics, idx) {
            if (idx < 0 || !metrics || idx > metrics.length) {
                return 'Please select a metric';
            }
            return 'Color: ' + metrics[idx].label;
        },
    });
})(pod_viewer_topology_graph || (pod_viewer_topology_graph = {})); // namespace pod_viewer_topology_graph
