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
/* Defines classes for managing the collection of lines in the parallel
   coordinates plot.
 */
import * as d3 from 'd3';
import * as tf_hparams_query_pane from '../tf_hparams_types/types';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';
import * as tf_hparams_api from '../types';
import {AxesCollection} from './axes';
import * as tf_hparams_parallel_coords_plot_interaction_manager from './interaction_manager';
import * as tf_hparams_parallel_coords_plot_utils from './utils';

export enum LineType {
  FOREGROUND,
  BACKGROUND,
}
/**
 * A handle to a representation of a session group in the 'LinesCollection'
 * class below. The handle can also be "null" -- meaning it references no
 * session group (similar to a "null pointer"), in which case the
 * 'sessionGroup()' method returns null.
 *
 * Note: we use this class rather than a simple SessionGroup object so that we
 * won't need to search the DOM for the <path> representing the session group;
 * instead the (foreground) <path> element is stored in the handle.
 */
export class SessionGroupHandle {
  /**
   * Constructs a session group handle from a D3 selection of the path
   * element representing the sessionGroup. This should only be called by the
   * 'LinesCollection' class below. If sessionGroupSel is empty or undefined, a
   * "null" handle will be constructed.
   */
  public constructor(sessionGroupSel?: any) {
    if (sessionGroupSel === undefined) {
      sessionGroupSel = d3.selectAll(null);
    }
    console.assert(sessionGroupSel.size() <= 1);
    this._sessionGroupSel = sessionGroupSel;
  }
  /**
   * @return the sessionGroup object this handle references or null if
   * this is a "null" reference.
   */
  public sessionGroup(): tf_hparams_api.SessionGroup | null {
    return this._sessionGroupSel.size() === 1
      ? this._sessionGroupSel.datum()
      : null;
  }
  public isNull(): boolean {
    return this.sessionGroup() === null;
  }
  /**
   * Should only be called by the 'LinesCollection' class below.
   * @return the d3-selection given on construction.
   */
  public selection(): any {
    return this._sessionGroupSel;
  }
  /**
   * Compares this handle to 'otherHandle' and returns true if both are null
   * or both are not null and they reference equal session groups.
   * Session group equality is determined by their names.
   */
  public equalsTo(otherHandle: SessionGroupHandle): boolean {
    if (this.isNull()) {
      return otherHandle.isNull();
    }
    if (otherHandle.isNull()) {
      return false;
    }
    return otherHandle.sessionGroup()?.name == this.sessionGroup()?.name;
  }
  private _sessionGroupSel: any; /* D3 selection */
}
/**
 * Manages the lines representing the session groups. Each session group is
 * represented by two <path> elements with the same control points: a foreground
 * and a background line, with the foreground line always rendered after the
 * background line (it succeeds it in document order). The foreground line is
 * colored based on the value  of the 'color-by' column (specified in options),
 * whereas the background line is gray. The foreground line is displayed only
 * if the session group passes the current axes brush filters. This way, only
 * session groups that pass the current brush filters will be represented by
 * colored lines, and the other session groups will be represented by gray
 * lines.
 *
 * Note that we could have represented each session group with a single line
 * with a color that depends on whether the session group passed the brush
 * filters. However, this would have required us to re-order the DOM to avoid
 * rendering gray lines on top of colored lines (which would look bad,
 * especially if the density of lines is large).
 *
 * This class also stores two SessionGroupHandles: peakedSessionGroupHandle and
 * selectedSessionGroupHandle, and provides methods for updating them. These
 * are used to store the peaked session group: the session group whose line
 * is closest to the mouse point. The peaked session group can be selected
 * by clicking the mouse pointer. The currently selected session group is
 * referenced by the selectedSessionGroupHandle.
 */
export class LinesCollection {
  public constructor(
    svgProps: tf_hparams_parallel_coords_plot_interaction_manager.SVGProperties,
    schema: tf_hparams_query_pane.Schema,
    axesCollection: AxesCollection
  ) {
    this._svgProps = svgProps;
    this._schema = schema;
    this._axesCollection = axesCollection;
    this._sessionGroups = [];
    this._svgProps.svgG.selectAll('g.background').remove();
    this._svgProps.svgG.selectAll('g.foreground').remove();
    this._bgPathsSel = this._svgProps.svgG
      .append('g')
      .classed('background', true)
      .selectAll('path');
    this._fgPathsSel = this._svgProps.svgG
      .append('g')
      .classed('foreground', true)
      .selectAll('path');
    this._updateVisibleFgPathsSel();
    this._peakedSessionGroupHandle = new SessionGroupHandle();
    this._selectedSessionGroupHandle = new SessionGroupHandle();
    this._d3line = d3.line().curve(d3.curveLinear);
  }
  /**
   * @return a SessionGroupHandle referencing the given sessionGroup. If the
   * given sessionGroup is null or undefined returns a "null" handle.
   */
  public getSessionGroupHandle(sessionGroup: tf_hparams_api.SessionGroup) {
    if (sessionGroup === null || sessionGroup === undefined) {
      return new SessionGroupHandle();
    }
    return new SessionGroupHandle(
      this._fgPathsSel.filter((sg) => sg.name === sessionGroup.name)
    );
  }
  public hideBackgroundLines() {
    this._bgPathsSel.attr('visibility', 'hidden');
  }
  public showBackgroundLines() {
    this._bgPathsSel.attr('visibility', null);
  }
  public peakedSessionGroupHandle(): SessionGroupHandle {
    return this._peakedSessionGroupHandle;
  }
  public selectedSessionGroupHandle(): SessionGroupHandle {
    return this._selectedSessionGroupHandle;
  }
  /**
   * Recomputes the control points of the lines with the given 'type'
   * (foreground or background) to correspond to the current state of the
   * axesCollection.
   *
   * @param lineType - The type of lines to update.
   * @param transitionDuration - The lines will be transitioned (animated) to
   *     their new state. This specifies the duration of that transition. 0
   *     means no animation.
   */
  public recomputeControlPoints(lineType: LineType, transitionDuration = 0) {
    const pathSel =
      lineType === LineType.FOREGROUND ? this._fgPathsSel : this._bgPathsSel;
    pathSel
      .transition()
      .duration(transitionDuration)
      .attr('d', (sessionGroup) => this._pathDAttribute(sessionGroup));
    if (lineType === LineType.FOREGROUND) {
      // Update the control points property, if we're updating the foreground
      // lines.
      window.setTimeout(() => {
        const _this = this;
        this._fgPathsSel.each(function (this: SVGPathElement, sessionGroup) {
          // '_this' refers to the 'LinesCollection' instance.
          _this._setControlPointsProperty(this, sessionGroup);
        });
      });
    }
  }
  erez;
  /**
   * Rerenders the foreground lines so that their visibility matches the
   * current brush filters.
   */
  public recomputeForegroundLinesVisibility() {
    this._fgPathsSel.classed(
      'invisible-path',
      (sessionGroup) =>
        !this._axesCollection.allVisibleAxesSatisfy((xPosition, axis) =>
          axis
            .brushFilter()
            .isPassing(
              tf_hparams_utils.columnValueByIndex(
                this._schema,
                sessionGroup,
                axis.colIndex()
              )
            )
        )
    );
    this._updateVisibleFgPathsSel();
  }
  /**
   * Sets the coloring scheme of the (visible) foreground lines.
   * A foreground line will be colored by a color corresponding to the value
   * of the column indexed by colorByColumnIndex in the session group
   * represented by the line. The color corresponding to a value is
   * interpolated between minColor and maxColor.
   */
  public setForegroundLinesColor(
    colorByColumnIndex: number | null,
    minColor: string,
    maxColor: string
  ) {
    const lineColorFunction = this._createLineColorFunction(
      colorByColumnIndex,
      minColor,
      maxColor
    );
    this._fgPathsSel.attr('stroke', lineColorFunction);
  }
  /**
   * Updates the sessionGroups, colorByColumnIndex, minColor and maxColor and
   * redraws the lines.
   */
  public redraw(
    sessionGroups: tf_hparams_api.SessionGroup[],
    colorByColumnIndex: number | null,
    minColor: string,
    maxColor: string
  ) {
    const peakedSG = this._peakedSessionGroupHandle.sessionGroup();
    const selectedSG = this._selectedSessionGroupHandle.sessionGroup();
    this._sessionGroups = sessionGroups;
    this._fgPathsSel = this._recomputePathSelection(this._fgPathsSel);
    this._bgPathsSel = this._recomputePathSelection(this._bgPathsSel);
    this._peakedSessionGroupHandle = this.getSessionGroupHandle(peakedSG!);
    this._selectedSessionGroupHandle = this.getSessionGroupHandle(selectedSG!);
    this.recomputeControlPoints(LineType.FOREGROUND);
    this.recomputeControlPoints(LineType.BACKGROUND);
    this.recomputeForegroundLinesVisibility();
    this.setForegroundLinesColor(colorByColumnIndex, minColor, maxColor);
  }
  public updatePeakedSessionGroup(newHandle: SessionGroupHandle) {
    this._peakedSessionGroupHandle.selection().classed('peaked-path', false);
    this._peakedSessionGroupHandle = newHandle;
    this._peakedSessionGroupHandle.selection().classed('peaked-path', true);
  }
  public clearPeakedSessionGroup() {
    this.updatePeakedSessionGroup(new SessionGroupHandle());
  }
  public updateSelectedSessionGroup(newHandle: SessionGroupHandle) {
    this._selectedSessionGroupHandle
      .selection()
      .classed('selected-path', false);
    this._selectedSessionGroupHandle = newHandle;
    this._selectedSessionGroupHandle.selection().classed('selected-path', true);
  }
  /**
   * Returns a handle referencing the closest session group to a given point
   * in the SVG or a null handle if the closest session group is
   * too far away.
   */
  public findClosestSessionGroup(x: number, y: number): SessionGroupHandle {
    const axesPositions = this._axesCollection.mapVisibleAxes<number>(
      (xPosition, axis) => xPosition
    );
    const closestFgPath = tf_hparams_parallel_coords_plot_utils.findClosestPath(
      this._visibleFgPathsSel.nodes(),
      axesPositions,
      [x, y],
      /* threshold */ 100
    );
    if (closestFgPath === null) {
      return new SessionGroupHandle();
    }
    return new SessionGroupHandle(d3.select(closestFgPath));
  }
  private _createLineColorFunction(
    colorByColumnIndex: number | null,
    minColor: string,
    maxColor: string
  ): (any) => string {
    if (colorByColumnIndex === null) {
      /* Use a default color if no color-by column is selected. */
      return () => 'red';
    }
    const colorScale = d3
      .scaleLinear</*range=*/ string, /*output=*/ string>()
      .domain(
        tf_hparams_utils.numericColumnExtent(
          this._schema,
          this._sessionGroups,
          colorByColumnIndex
        ) as any
      )
      .range([minColor, maxColor])
      .interpolate(d3.interpolateLab);
    return (sessionGroup) =>
      colorScale(
        tf_hparams_utils.columnValueByIndex(
          this._schema,
          sessionGroup,
          colorByColumnIndex
        )
      );
  }
  private _recomputePathSelection(currentPathSel: any /* d3 selection */) {
    currentPathSel = currentPathSel.data(
      this._sessionGroups,
      /*key=*/ (sessionGroup) => sessionGroup.name
    );
    currentPathSel.exit().remove();
    return currentPathSel.enter().append('path').merge(currentPathSel);
  }
  /** Sets the controlPoints property of 'pathElement' to the control-points
   * array of the given sessionGroup with respect to the current state of
   * the axesCollection.
   */
  private _setControlPointsProperty(
    pathElement: any,
    sessionGroup: tf_hparams_api.SessionGroup
  ) {
    pathElement.controlPoints = this._computeControlPoints(sessionGroup);
  }
  /**
   * @return an array of 2-tuples--each representing a control point for
   * a line representing the given 'sessionGroup'. The control points are
   * computed with respect to the current state of the axesCollection.
   */
  private _computeControlPoints(
    sessionGroup: tf_hparams_api.SessionGroup
  ): [number, number][] {
    return this._axesCollection.mapVisibleAxes<[number, number]>(
      (xPosition, axis) => [
        xPosition,
        axis.yScale()(
          tf_hparams_utils.columnValueByIndex(
            this._schema,
            sessionGroup,
            axis.colIndex()
          )
        ),
      ]
    );
  }
  private _pathDAttribute(sessionGroup: tf_hparams_api.SessionGroup): string {
    return this._d3line(this._computeControlPoints(sessionGroup));
  }
  private _updateVisibleFgPathsSel() {
    this._visibleFgPathsSel = this._fgPathsSel.filter(':not(.invisible-path)');
  }
  private readonly _svgProps: tf_hparams_parallel_coords_plot_interaction_manager.SVGProperties;
  private readonly _schema: tf_hparams_query_pane.Schema;
  private readonly _d3line: any; /* D3 line */
  private readonly _axesCollection: AxesCollection;
  private _sessionGroups: tf_hparams_api.SessionGroup[];
  private _fgPathsSel: any; /* D3 selection */
  private _bgPathsSel: any; /* D3 selection */
  /**
   * Contains the subset of _fgPathsSel which is visible w.r.t the current
   * brush filters.
   */
  private _visibleFgPathsSel: any; /* D3 selection */
  private _peakedSessionGroupHandle: SessionGroupHandle;
  private _selectedSessionGroupHandle: SessionGroupHandle;
}
function _isInteractiveD3Event(d3Event: any) {
  return d3.event.sourceEvent !== null;
}
