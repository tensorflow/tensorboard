/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as d3 from 'd3';
import * as _ from 'lodash';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';

/**
 * A d3-based scatter plot matrix visualization component.
 * This component renders the actual plots; the "controls" part of the
 * visualization are rendered by tf-hparams-scale-and-color-controls.
 *
 * TODO(erez): The logic for computing the number of ticks so that tick labels
 * do not overlap is ignored, for some reason, when we set compile=True in
 * the vulcanization build step. Figure out why.
 */
@customElement('tf-hparams-scatter-plot-matrix-plot')
class TfHparamsScatterPlotMatrixPlot extends LegacyElementMixin(
  PolymerElement
) {
  static readonly template = html`
    <div id="container">
      <svg id="svg"></svg>
    </div>

    <style>
      :host {
        display: block;
      }
      svg {
        font: 10px sans-serif;
      }

      text {
        fill: currentColor;
      }

      .frame rect {
        stroke: currentColor;
      }

      /* The closest data point marker to the mouse pointer. We use !important
         to override the inline style that sets the regular style of a marker.
      */
      .closest-marker {
        r: 6 !important;
      }

      /* The currently selected data point marker. We use !important to
         override the inline style that sets the regular style of a marker. */
      .selected-marker {
        r: 6 !important;
        fill: #0f0 !important;
      }
    </style>
  `;
  // Public properties
  // See the property description in tf-hparams-query-pane.html
  @property({type: Object})
  visibleSchema: any;
  @property({type: Array})
  sessionGroups: unknown[];
  // See the description in tf-hparams-scale-and-color-controls.html
  @property({type: Object})
  options: any;
  // The last session group that was clicked on or null if no
  // session group was clicked on yet.
  @property({
    type: Object,
    notify: true,
  })
  selectedSessionGroup: object = null!;
  // The session group represented by the marker "closest" to the mouse
  // pointer. If the closest session group distance is larger than a
  // threshold, this property will be null.
  @property({
    type: Object,
    notify: true,
  })
  closestSessionGroup: object = null!;
  // The <div> element with id "container".
  @property({
    type: Object,
  })
  _container: HTMLElement = null!;
  // A D3 selection containing just the root <svg> element.
  @property({
    type: Object,
  })
  _svg: any = null;
  @property({
    type: Number,
  })
  width: number = 0;
  @property({
    type: Number,
  })
  height: number = 0;
  // The index of the cell containing a brush selection as an array
  // of the form [col, metric] or null if no cell has an active brush
  // selection.
  @property({
    type: Object,
  })
  _brushedCellIndex: object = null!;
  // The the active brush selection in the form
  // [[x0,y0],[x1,y1]] where the coordinates are relative to the cell
  // indexed by _brushedCellIndex. Set to null, if there is no active
  // brush.
  @property({
    type: Object,
  })
  _brushSelection: object = null!;
  ready() {
    super.ready();

    this._container = this.$['container'] as HTMLElement;
    this._svg = d3.select(this.$['svg'] as HTMLElement);
    this._redraw();
  }
  @observe('sessionGroups.*')
  _sessionGroupsChanged() {
    if (this.selectedSessionGroup !== null) {
      // Try to keep the selected session group: if the new sessionGroups
      // array has a sessionGroup with the same name as the one that was
      // selected before, select it.
      this.selectedSessionGroup =
        tf_hparams_utils.sessionGroupWithName(
          this.sessionGroups,
          (this.selectedSessionGroup as any).name
        ) || null;
    }
    this._redraw();
  }
  @observe('visibleSchema.*')
  _visibleSchemaChanged() {
    this._brushedCellIndex = null!;
    this._brushSelection = null!;
    this._redraw();
  }
  @observe('options.*')
  // Redraws the plot.
  _redraw() {
    this.debounce(
      '_redraw',
      () => {
        const utils = tf_hparams_utils;
        const PLOT_MIN_WIDTH = 1200;
        const PLOT_MIN_HEIGHT = 0.4 * PLOT_MIN_WIDTH;
        const CELL_MIN_WIDTH = 150;
        const CELL_MIN_HEIGHT = 0.75 * CELL_MIN_WIDTH;
        this.width = Math.max(
          CELL_MIN_WIDTH * utils.numVisibleColumns(this.visibleSchema),
          PLOT_MIN_WIDTH
        );
        this.height = Math.max(
          CELL_MIN_HEIGHT * utils.numVisibleMetrics(this.visibleSchema),
          PLOT_MIN_HEIGHT
        );
        this._container.style.width = this.width + 'px';
        this._container.style.height = this.height + 'px';
        this._svg.attr('width', this.width).attr('height', this.height);
        // Delete all elements in the svg subtree
        this._svg.selectAll('g').remove();
        // Draw.
        this._draw();
      },
      100
    );
  }
  // Creates the DOM elements comprising the scatter-plot-matrix plot and
  // registers event handlers to handle user actions.
  _draw() {
    const utils = tf_hparams_utils;
    const _this = this;
    if (
      !this.sessionGroups ||
      this.sessionGroups.length == 0 ||
      !this.visibleSchema ||
      this.visibleSchema.metricInfos.length == 0
    ) {
      // If there's no metrics or session groups. There's nothing to draw.
      return;
    }
    // An array containing the visibleSchema-columns (hparams followed by
    // metrics) indices. These index the columns of the scatter plot matrix.
    const cols = d3.range(utils.numVisibleColumns(_this.visibleSchema));
    // An array containing the metric indices. These index the rows of the
    // scatter plot matrix.
    const metrics = d3.range(utils.numVisibleMetrics(_this.visibleSchema));
    // The margin in pixels from the left to leave for the y-axis text
    // (tick values and x-axis label).
    const yAxisTextMargin = 80;
    // The margin in pixels from the bottom to leave for the x-axis text
    // (tick values and x-axis label).
    const xAxisTextMargin = 50;
    // Each cell in the scatter plot matrix has a rectangular frame.
    // The margin in pixels to use between the cell boundary and its frame.
    const frameMargin = 5;
    // cellX(col), cellY(metric) are the svg coordinates of the upper
    // left corner of the boundary of the cell indexed by (col, metric).
    const cellX = d3
      .scaleBand()
      .domain(cols as any)
      .range([yAxisTextMargin + frameMargin, this.width - 1 - frameMargin])
      .paddingInner(0.1);
    const cellY = d3
      .scaleBand()
      .domain(metrics as any)
      .range([this.height - 1 - frameMargin - xAxisTextMargin, frameMargin])
      .paddingInner(0.1);
    const cellWidth = cellX.bandwidth();
    const cellHeight = cellY.bandwidth();
    // xCoords[col](colValue), yCoords[metric](metricValue) are the
    // coordinates of the marker representing the data
    // (colValue, metricValue) in the cell indexed by (col, metric).
    // The coordinates are relative to the cell boundary's upper
    // left corner.
    const xCoords = cols.map((c) => _this._cellScale(c, [0, cellWidth - 1]));
    const yCoords = metrics.map((m) =>
      _this._cellScale(m + utils.numVisibleHParams(_this.visibleSchema), [
        cellHeight - 1,
        0,
      ])
    );
    // ---------------------------------------------------------------------
    // Draw axes.
    // ---------------------------------------------------------------------
    // X-Axes and labels.
    const xAxesG = this._svg
      .selectAll('.x-axis')
      .data(cols)
      .enter()
      .append('g')
      .classed('x-axis', true)
      .attr('transform', (col) => utils.translateStr(cellX(col), 0));
    function xAxisClipPathId(col) {
      return 'x-axis-clip-path-' + col;
    }
    function xLabelClipPathId(col) {
      return 'x-label-clip-path-' + col;
    }
    xAxesG
      .append('clipPath')
      .attr('id', xAxisClipPathId)
      .append('rect')
      .attr('x', -frameMargin)
      .attr('y', 0)
      .attr('width', cellWidth + 2 * frameMargin)
      .attr('height', _this.height - xAxisTextMargin / 2);
    xAxesG
      .append('clipPath')
      .attr('id', xLabelClipPathId)
      .append('rect')
      .attr('x', 0)
      .attr('y', _this.height - xAxisTextMargin / 2)
      .attr('width', cellWidth)
      .attr('height', xAxisTextMargin / 2);
    xAxesG
      .append('g')
      .attr('clip-path', (col) => 'url(#' + xAxisClipPathId(col) + ')')
      .each(function (col) {
        d3.select(this).call(
          drawAxis,
          d3
            .axisBottom(xCoords[col] as any)
            .tickSize(_this.height - xAxisTextMargin),
          cellWidth,
          /* minLabelSize */ 40,
          _this.options.columns[col].scale
        );
      });
    // Draw a label for each axis.
    xAxesG
      .append('g')
      .classed('x-axis-label', true)
      .attr('clip-path', (col) => 'url(#' + xLabelClipPathId(col) + ')')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', cellWidth / 2)
      .attr('y', _this.height - 1 - xAxisTextMargin / 4)
      .text((col) => utils.schemaVisibleColumnName(_this.visibleSchema, col))
      .append('title') // Show full name as a tooltip.
      .text((col) => utils.schemaVisibleColumnName(_this.visibleSchema, col));
    // Y-Axes and labels.
    const yAxesG = this._svg
      .selectAll('.y-axis')
      .data(metrics)
      .enter()
      .append('g')
      .classed('y-axis', true)
      .attr('transform', (metric) =>
        utils.translateStr(_this.width - 1, cellY(metric))
      );
    function yAxisClipPathId(metric) {
      return 'y-axis-clip-path-' + metric;
    }
    function yLabelClipPathId(metric) {
      return 'y-label-clip-path-' + metric;
    }
    yAxesG
      .append('clipPath')
      .attr('id', yAxisClipPathId)
      .append('rect')
      .attr('x', -(_this.width - yAxisTextMargin / 2 - 1))
      .attr('y', -frameMargin)
      .attr('width', _this.width - yAxisTextMargin / 2)
      .attr('height', cellHeight + 2 * frameMargin);
    yAxesG
      .append('clipPath')
      .attr('id', yLabelClipPathId)
      .append('rect')
      .attr('x', -(_this.width - 1))
      .attr('y', 0)
      .attr('width', yAxisTextMargin / 2)
      .attr('height', cellHeight);
    yAxesG
      .append('g')
      .attr('clip-path', (metric) => 'url(#' + yAxisClipPathId(metric) + ')')
      .each(function (metric) {
        d3.select(this).call(
          drawAxis,
          d3
            .axisLeft(yCoords[metric] as any)
            .tickSize(_this.width - yAxisTextMargin),
          cellHeight,
          /* minLabelSize */ 20,
          _this.options.columns[
            metric + utils.numVisibleHParams(_this.visibleSchema)
          ].scale
        );
      });
    // Append a label for each axis.
    yAxesG
      .append('g')
      .classed('y-axis-label', true)
      .attr('clip-path', (metric) => 'url(#' + yLabelClipPathId(metric) + ')')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', -(_this.width - yAxisTextMargin / 4 - 1))
      .attr('y', cellHeight / 2)
      .attr(
        'transform',
        utils.rotateStr(
          90,
          -(_this.width - yAxisTextMargin / 4 - 1),
          cellHeight / 2
        )
      )
      .text((metric) =>
        utils.metricName(_this.visibleSchema.metricInfos[metric])
      )
      .append('title') // Show full name as a tooltip.
      .text((metric) =>
        utils.metricName(_this.visibleSchema.metricInfos[metric])
      );
    function drawAxis(g, axisGen, axisLength, minLabelSize, scaleType) {
      // We compute the number of ticks to display based on the estimate
      // of the minimum size to allow for a label.
      const numTicks = Math.floor(axisLength / minLabelSize);
      const scale = axisGen.scale();
      if (scaleType === 'QUANTILE') {
        // The default tickValues of a quantile scale is just the scale
        // domain, which produces overlapping labels if the number of
        // elements in the domain is greater than the number of
        // quantiles.
        let quantiles = scale.quantiles();
        const step = Math.ceil(quantiles.length / numTicks);
        quantiles = d3
          .range(0, quantiles.length, step)
          .map((i) => quantiles[i]);
        axisGen.tickValues(quantiles).tickFormat(d3.format('-.2g'));
      }
      if (scaleType === 'LINEAR' || scaleType === 'LOG') {
        // The following is equivalent to: axisGen.ticks(numTicks). We
        // use the form below, since otherwise the closure compiler
        // erroneously drops the parameter 'numTicks' from the call. It does
        // this, since d3 defines the variadic 'ticks' method as
        // function(), which closure regards as a function that takes no
        // parameters.
        axisGen['ticks'](numTicks);
      }
      g.call(axisGen);
      // Remove the actual axis line, and grey out the tick lines.
      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', '#ddd');
    }
    // ---------------------------------------------------------------------
    // Draw cell frames.
    // ---------------------------------------------------------------------
    const cells = this._svg
      .selectAll('.cell')
      .data(d3.cross(cols, metrics))
      .enter()
      .append('g')
      .classed('cell', true)
      .attr('transform', ([col, metric]) =>
        utils.translateStr(cellX(col), cellY(metric))
      );
    const frames = cells
      .append('g')
      .classed('frame', true)
      .append('rect')
      .attr('x', -frameMargin)
      .attr('y', -frameMargin)
      .attr('width', cellWidth + 2 * frameMargin)
      .attr('height', cellHeight + 2 * frameMargin)
      .attr('stroke', '#000')
      .attr('fill', 'none')
      .attr('shape-rendering', 'crispEdges');
    // ---------------------------------------------------------------------
    // Draw data point markers.
    // ---------------------------------------------------------------------
    let colorScale: any = null;
    if (_this.options.colorByColumnIndex !== undefined) {
      colorScale = d3
        .scaleLinear()
        .domain(this._colExtent(this.options.colorByColumnIndex) as any)
        .range([this.options.minColor, this.options.maxColor])
        .interpolate(d3.interpolateLab as any);
    }
    // A function mapping a sessionGroup to its marker's color.
    const markerColorFn =
      _this.options.colorByColumnIndex === undefined
        ? /* Use default color if no color-by column is selected. */
          () => 'red'
        : ({sessionGroup}) =>
            colorScale(
              this._colValue(sessionGroup, _this.options.colorByColumnIndex)
            );
    // Returns the x coordinate for the marker representing sessionGroup
    // in a cell in the scatter plot matrix column indexed by 'col'.
    function markerX(sessionGroup, col) {
      return xCoords[col](_this._colValue(sessionGroup, col));
    }
    // Returns the y coordinate for the marker representing sessionGroup
    // in a cell in the scatter plot matrix row indexed by 'metric'.
    function markerY(sessionGroup, metric) {
      return yCoords[metric](_this._metricValue(sessionGroup, metric));
    }
    // A function that gets a selection of <g> elements--each should be
    // a child node of a cell <g> element (a memeber of the 'cells'
    // selection) and draws markers representing the data points in each
    // cell. The parameter 'fill' is either a constant specifying the
    // 'fill' attribute of each marker or a function taking a session
    // group that returns the fill attribute that should be set for the
    // marker representing the given session group. The function returns
    // a 3-tuple of [markers, cellMarkers, sessionGroupMarkersMap],
    // where: markers is the d3-selection of the markers,
    // cellMarkers is a 2-D array whose [col][metric] entry has a
    // d3-selection containing the markers in the [col, metric] cell,
    // and sessionGroupMarkersMap is a Map mapping a sessionGroup to the
    // array of marker HTML elements representing that sessionGroup.
    function addMarkers(cellsGSelection, fill) {
      const markers = cellsGSelection
        .selectAll('.data-marker')
        .data(([col, metric]) =>
          // Filter out session groups that don't have a metric-value
          // or a column-value for the current cell.
          _this.sessionGroups
            .filter(
              (sessionGroup) =>
                _this._colValue(sessionGroup, col) !== undefined &&
                _this._metricValue(sessionGroup, metric) !== undefined
            )
            .map((sessionGroup) => ({
              col: col,
              metric: metric,
              sessionGroup: sessionGroup,
              x: markerX(sessionGroup, col),
              y: markerY(sessionGroup, metric),
              // This will be populated by the code below with
              // a Set of all the markers representing this session
              // group.
              sessionGroupMarkers: null,
            }))
        )
        .enter()
        .append('circle')
        .classed('data-marker', true)
        .attr('cx', ({x}) => x)
        .attr('cy', ({y}) => y)
        .attr('r', 2)
        .attr('fill', fill);
      const sessionGroupMarkersMap = new Map<any, any[]>();
      _this.sessionGroups.forEach((sessionGroup) => {
        sessionGroupMarkersMap.set(sessionGroup, []);
      });
      markers.each(function (d) {
        sessionGroupMarkersMap.get(d.sessionGroup)?.push(this);
      });
      markers.each((d) => {
        const sessionGroupMarkers = sessionGroupMarkersMap.get(d.sessionGroup);
        d.sessionGroupMarkers = new Set(sessionGroupMarkers);
      });
      const cellMarkers = cols.map((col) =>
        metrics.map((metric) =>
          markers.filter((d) => d.col == col && d.metric == metric)
        )
      );
      return [markers, cellMarkers, sessionGroupMarkersMap];
    }
    const [markers, cellMarkers, sessionGroupMarkersMap] = addMarkers(
      cells.append('g'),
      /* fill */ markerColorFn
    );
    // ---------------------------------------------------------------------
    // Create a brush for each cell. Brushing a cell makes "visible" only
    // the markers associated with session groups whose markers
    // in the brushed cell lie within the brush selection. By "visibile"
    // here, we man colored according to color-by column. Markers that
    // are not "visibile" will be shown as grayed out.
    // ---------------------------------------------------------------------
    // For each cell, we index the markers in a quad-tree to quickly
    // find the intersection of the markers with the (brush) selection.
    // The following function creates this quad-tree for the cell indexed by
    // (col, metric). Each quad tree datum is the corresponding marker's
    // element.
    function createCellQuadTree(col, metric) {
      const data: any[] = [];
      cellMarkers[col][metric].each(function () {
        data.push(this);
      });
      return d3
        .quadtree()
        .x((elem: any) => (d3.select(elem).datum() as any).x)
        .y((elem: any) => (d3.select(elem).datum() as any).y)
        .addAll(data);
    }
    const quadTrees = cols.map((col) =>
      metrics.map((metric) => createCellQuadTree(col, metric))
    );
    // A d3-selection of the cell in 'cells' that has the active
    // brush selection, or null if the brush is not active.
    let brushedCellG: any = null;
    if (isBrushActive()) {
      brushedCellG = cells.filter((cellIndex) =>
        _.isEqual(cellIndex, _this._brushedCellIndex)
      );
      console.assert(brushedCellG.size() == 1, brushedCellG);
    }
    // The set of markers (in all cells) that are visible. We keep this
    // set around so that when the brush selection changes we can change
    // the "fill" attribute of only the markers we need to. This reduces
    // the browser's rendering time and makes brushing smoother.
    let visibleMarkers = new Set(markers.nodes());
    updateVisibleMarkers();
    function updateVisibleMarkers() {
      // We regard an empty (or inactive) brush selection as selecting
      // all markers.
      let newVisibleMarkers = new Set(markers.nodes());
      if (!isBrushSelectionEmpty()) {
        newVisibleMarkers = findMarkersInSelection(
          _this._brushedCellIndex,
          _this._brushSelection
        );
      }
      // Highlight the new visible markers.
      d3.selectAll(
        Array.from(
          utils.filterSet(
            newVisibleMarkers,
            (elem) => !visibleMarkers.has(elem)
          )
        ) as any
        // @ts-ignore TS2769: No overload matches this call. for markerColorFn
      ).attr('fill', markerColorFn);
      // Gray-out the no-longer visible markers.
      d3.selectAll(
        Array.from(
          utils.filterSet(
            visibleMarkers,
            (elem) => !newVisibleMarkers.has(elem)
          )
        ) as any
      ).attr('fill', '#ddd');
      visibleMarkers = newVisibleMarkers;
    }
    // Returns a Set of all marker elements that are in the
    // rectangle 'selection' given in coordinates relative to the
    // cell indexed by cellIndex .
    function findMarkersInSelection(cellIndex, selection) {
      console.assert(cellIndex !== null);
      console.assert(selection !== null);
      const [col, metric] = cellIndex;
      const result = new Set();
      utils.quadTreeVisitPointsInRect(
        quadTrees[col][metric],
        selection[0][0],
        selection[0][1],
        selection[1][0],
        selection[1][1],
        (elem) => {
          const data = d3.select(elem).datum() as any;
          data.sessionGroupMarkers.forEach((sg_elem) => {
            result.add(sg_elem);
          });
        }
      );
      return result;
    }
    const brush = d3
      .brush()
      .extent([
        [-frameMargin + 1, -frameMargin + 1],
        [cellWidth - 1 + frameMargin - 1, cellHeight - 1 + frameMargin - 1],
      ])
      .on('start', function () {
        if (isBrushActive() && brushedCellG.node() != this) {
          // The brush is active in a different cell.
          // Clear the selection first.
          // This will recursively call the 'start', 'brush', and
          // 'end' event listeners for the cell with the selection
          // and will update the markers. The 'if' above
          // prevents infinite recursion.
          brush.move(brushedCellG, null);
        }
        brushChanged(this);
      })
      .on('brush', function () {
        brushChanged(this);
      })
      .on('end', function () {
        brushChanged(this);
      });
    // Updates the internal state in response to a brush event in
    // the cell whose <g> element (in 'cells') is given by cellGNode
    function brushChanged(cellGNode) {
      // For some reason the closure compiler drops the argument when we
      // write the call below as 'd3.brushSelection(cellGNode)'.
      const brushSelection = d3['brushSelection'](cellGNode);
      if (
        (!isBrushActive() && brushSelection === null) ||
        (isBrushActive() &&
          cellGNode === brushedCellG.node() &&
          _.isEqual(brushSelection, _this._brushSelection))
      ) {
        // Nothing to do if selection hasn't changed.
        return;
      }
      _this._brushSelection = brushSelection!;
      if (brushSelection !== null) {
        brushedCellG = d3.select(cellGNode);
        _this._brushedCellIndex = brushedCellG.datum();
      } else {
        brushedCellG = null;
        _this._brushedCellIndex = null!;
      }
      updateVisibleMarkers();
    }
    function isBrushActive() {
      return _this._brushedCellIndex !== null && _this._brushSelection !== null;
    }
    function isBrushSelectionEmpty() {
      return (
        !isBrushActive() ||
        _this._brushSelection[0][0] === _this._brushSelection[1][0] ||
        _this._brushSelection[0][1] === _this._brushSelection[1][1]
      );
    }
    // Render the brush elements on each cell.
    cells.call(brush);
    if (isBrushActive()) {
      // Set the internal brush selection to what it was before
      // the 'redraw()'.
      brush.move(brushedCellG, _this._brushSelection as any);
    }
    // ---------------------------------------------------------------------
    // Add event listeners for highlighting the session group whose markers
    // are closest to the mouse pointer (only "visible" session groups
    // are considered -- see brushing above). Also, add event listeners
    // for making the highlighted session group the currently-selected
    // group by clicking.
    // ---------------------------------------------------------------------
    // A d3-selection containing the nodes in markers representing the
    // SessionGroup with a marker closest to the mouse pointer or null
    // if the distance to the closest session group is greater than a
    // threshold. This won't get set until the first mouse movement over
    // a cell.
    let closestMarkers: any = null;
    // A d3-selection containing the nodes in markers representing the
    // markers of the currently selected session group or null if no
    // session group is selected.
    let selectedMarkers: any = null;
    if (this.selectedSessionGroup !== null) {
      selectedMarkers = d3
        .selectAll(sessionGroupMarkersMap.get(this.selectedSessionGroup))
        .classed('selected-marker', true);
    }
    cells
      .on('click', function () {
        const newSelectedMarkers =
          closestMarkers === selectedMarkers ? null : closestMarkers;
        if (newSelectedMarkers === selectedMarkers) {
          return;
        }
        if (selectedMarkers !== null) {
          selectedMarkers.classed('selected-marker', false);
        }
        selectedMarkers = newSelectedMarkers;
        if (selectedMarkers !== null) {
          selectedMarkers.classed('selected-marker', true);
        }
        const newSessionGroup =
          selectedMarkers === null
            ? null
            : // All elements in selectedMarkers should have the same
              // sessionGroup.
              selectedMarkers.datum().sessionGroup;
        _this.selectedSessionGroup = newSessionGroup;
      })
      .on('mousemove mouseenter', function ([col, metric]) {
        const [x, y] = d3.mouse(this);
        const newClosestMarkers = findClosestMarkers(
          col,
          metric,
          x,
          y,
          /* threshold */ 20
        );
        if (closestMarkers === newClosestMarkers) {
          return;
        }
        if (closestMarkers !== null) {
          closestMarkers.classed('closest-marker', false);
        }
        closestMarkers = newClosestMarkers;
        if (closestMarkers !== null) {
          closestMarkers.classed('closest-marker', true);
          // All elements in closestMarkers should have the same
          // sessionGroup.
          _this.closestSessionGroup = closestMarkers.datum().sessionGroup;
        } else {
          _this.closestSessionGroup = null!;
        }
      })
      .on('mouseleave', function ([col, metric]) {
        if (closestMarkers !== null) {
          closestMarkers.classed('closest-marker', false);
          closestMarkers = null;
          _this.closestSessionGroup = null!;
        }
      });
    // Finds a closest visible marker in the [col,metric] cell to the point
    // with cell-relative coordinates (x,y). If that point's distance
    // to the point at (x,y) is larger than threshold, returns null;
    // otherwise returns the d3-selection consisting of the markers
    // representing the session group of that closest marker.
    function findClosestMarkers(metric, col, x, y, threshold) {
      let minDist = Infinity;
      let minSessionGroup = null;
      utils.quadTreeVisitPointsInDisk(
        quadTrees[metric][col],
        x,
        y,
        threshold,
        (elem, distanceToCenter) => {
          if (visibleMarkers.has(elem) && distanceToCenter < minDist) {
            const data = d3.select(elem).datum() as any;
            minDist = distanceToCenter;
            minSessionGroup = data.sessionGroup;
          }
        }
      );
      if (minSessionGroup === null) {
        return null;
      }
      return d3.selectAll(sessionGroupMarkersMap.get(minSessionGroup));
    }
    // ---------------------------------------------------------------------
    // Polymer adds an extra ".tf-hparams-scatter-plot-matrix-plot" class to
    // each rule selector in the <style> section written above. When
    // polymer stamps a template it adds this class to every element
    // stamped; since we're injecting our own elements here, we add this
    // class to each element so that the style rules defined above will
    // apply.
    this._svg
      .selectAll('*')
      .classed('tf-hparams-scatter-plot-matrix-plot', true);
  }
  // Returns a d3 scale mapping either a metric or an hparam value
  // to the cell's coordinate system. 'range' should be an interval in the
  // cell's coordinate system representing the range of the scale. The
  // metric or hparam to be mapped should be specified as the
  // visibleSchema-column indexed by colIndex.
  _cellScale(colIndex, range) {
    const extent = this._colExtent(colIndex) as any;
    const linearScale = d3.scaleLinear().domain(extent).range(range);
    if (this.options.columns[colIndex].scale === 'LINEAR') {
      return linearScale;
    } else if (this.options.columns[colIndex].scale === 'LOG') {
      if (extent[0] <= 0 && extent[1] >= 0) {
        // We can't have a log scale for data whose extent contains 0.
        // Use a linear scale instead.
        // TODO(erez): Create a symlog scale similar to Matplotlib's
        // symlog. See also d3 issue here:
        // https://github.com/d3/d3-scale/issues/105
        // and b/111755540
        return linearScale;
      }
      return d3.scaleLog().domain(extent).range(range);
    } else if (this.options.columns[colIndex].scale === 'QUANTILE') {
      // Compute 20-quantiles:
      const step = (range[1] - range[0]) / 19;
      // Compute the scale's range to be:
      // {range[0], range[0]+step, ..., range[1]}.
      // d3.range(range[0], range[1]+step, step) has numerical
      // issues and may produce an extra member, so we use a
      // different procedure:
      const scaleRange = d3.range(20).map((i) => range[0] + step * i);
      return d3
        .scaleQuantile()
        .domain(
          _.uniq(this.sessionGroups.map((sg) => this._colValue(sg, colIndex)))
        )
        .range(scaleRange);
    } else if (this.options.columns[colIndex].scale === 'NON_NUMERIC') {
      return d3
        .scalePoint()
        .domain(
          // We sort the session groups to make the order
          // stable across 'ListSessionGroups' RPCs
          _.uniq(
            this.sessionGroups.map((sg) => this._colValue(sg, colIndex)).sort()
          )
        )
        .range(range)
        .padding(0.1);
    } else {
      throw (
        'Unknown scale for column: ' + colIndex + '. options: ' + this.options
      );
    }
  }
  _colValue(sessionGroup, colIndex) {
    return tf_hparams_utils.columnValueByVisibleIndex(
      this.visibleSchema,
      sessionGroup,
      colIndex
    );
  }
  _metricValue(sessionGroup, metricIndex) {
    return tf_hparams_utils.metricValueByVisibleIndex(
      this.visibleSchema,
      sessionGroup,
      metricIndex
    );
  }
  _colExtent(colIndex) {
    return tf_hparams_utils.visibleNumericColumnExtent(
      this.visibleSchema,
      this.sessionGroups,
      colIndex
    );
  }
}
