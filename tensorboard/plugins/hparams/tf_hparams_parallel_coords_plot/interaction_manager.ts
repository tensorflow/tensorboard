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
/* Defines the InteractionManager class and related classes.
   This is the main entry point to the parallel coordinates implementation.
*/
import * as d3 from 'd3';
import * as tf_hparams_query_pane from '../tf_hparams_types/types';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';
import * as tf_hparams_api from '../types';
import {AxesCollection} from './axes';
import {LinesCollection, LineType, SessionGroupHandle} from './lines';

type SessionGroupCallback = (
  SessionGroup: tf_hparams_api.SessionGroup | null
) => void;
/**
 * Stores some global properties such as width and height of the SVG element
 * used for rendering the parallel coordinates plot. Also contains the top-level
 * DOM <g> element underwhich the plot will be rendered.
 */
export class SVGProperties {
  /**
   * Computes the width and height of the SVG element based on the number of
   * columns in the schema. Adds some margins and adds a top-level <g> element
   * underwhich the plot should be rendered.
   */
  constructor(svg: HTMLElement, numColumns: number) {
    // We use the following algorithm for laying out our SVG:
    // We compute a minimum size for the SVG based on the number columns
    // and some margins. We set the svg "width" and "height" styles
    // to "100%" so that it takes up the full area of its parent, but use
    // "min-width" and "min-height", so that if the parent is too small
    // the svg won't shrink down (it will overflow with scroll bars).
    // If the parent is larger than the minimum size, we use its
    // preserveAspectRatio attr to scale the contents to fit the larger size.
    this.svg = d3.select(svg);
    const margin = {top: 30, right: 10, bottom: 10, left: 10};
    const COL_WIDTH = 100;
    const COL_HEIGHT = 200;
    const totalWidth = numColumns * COL_WIDTH + margin.left + margin.right;
    const totalHeight = COL_HEIGHT + margin.top + margin.bottom;
    this.svg.attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    this.svg.attr('preserveAspectRatio', 'xMidYMid');
    // Set a minimum width so scale factor want be less than 1
    // (but if size of '#container' is larger then we'll scale up
    // our svg).
    this.svg.style('min-width', totalWidth + 'px');
    this.svg.style('min-height', totalHeight + 'px');
    // 'width' and 'height' store the width of the svg without our margins.
    this.width = totalWidth - margin.left - margin.right;
    this.height = totalHeight - margin.top - margin.bottom;
    this.svgG = this.svg
      .append('g')
      .attr(
        'transform',
        tf_hparams_utils.translateStr(margin.left, margin.top)
      );
  }
  public readonly svg: any; /* D3 selection of the top level SVG*/
  public readonly svgG: any; /* D3 selection of the top level <g> element */
  public readonly height: number;
  public readonly width: number;
}
/**
 * Orchastrates the behavior of the parallel coordinates plot. This is the
 * class that consumers of this module should use.
 * Usage example:
 *    manager = new InteractionManager(svgProps, schema, peakedSessionChangedCB,
 *                                     selectedSessionChangedCB);
 *    ...
 *    // Notify manager of new options or session groups:
 *    manager.onOptionsOrSessionGroupsChanged(newOptions, newSessionGroups)
 *    ...
 *    // This will be called when peaked session changed:
 *    function peakedSessionChangedCB(newSessionGroup) {
 *      // Do something with the newSessionGroup.
 *    }
 */
export class InteractionManager {
  public constructor(
    svgProps: SVGProperties,
    schema: tf_hparams_query_pane.Schema,
    peakedSessionGroupChangedCallback: SessionGroupCallback,
    selectedSessionChangedCallback: SessionGroupCallback
  ) {
    this._svgProps = svgProps;
    this._schema = schema;
    this._peakedSessionGroupChangedCB = peakedSessionGroupChangedCallback;
    this._selectedSessionGroupChangedCB = selectedSessionChangedCallback;
    this._axesCollection = new AxesCollection(
      svgProps,
      schema,
      /*interactionManager=*/ this
    );
    this._linesCollection = new LinesCollection(
      svgProps,
      schema,
      this._axesCollection
    );
    this._svgProps.svg
      .on('click', () => this.onClick())
      .on('mousemove mouseenter', () => {
        const [x, y] = d3.mouse(this._svgProps.svgG.node());
        this.onMouseMoved(x, y);
      })
      .on('mouseleave', () => this.onMouseLeave());
  }
  public onDragStart(colIndex: number) {
    this._axesCollection.dragStart(colIndex);
    this._linesCollection.hideBackgroundLines();
  }
  public onDrag(newX: number) {
    this._axesCollection.drag(newX);
    this._linesCollection.recomputeControlPoints(LineType.FOREGROUND);
  }
  public onDragEnd() {
    this._axesCollection.dragEnd(/*transitionDuration=*/ 500);
    this._linesCollection.recomputeControlPoints(
      LineType.FOREGROUND,
      /* transitionDuration=*/ 500
    );
    window.setTimeout(() => {
      this._linesCollection.recomputeControlPoints(LineType.BACKGROUND);
      this._linesCollection.showBackgroundLines();
    }, 500);
  }
  public onBrushChanged(
    colIndex: number,
    newBrushSelection: d3.BrushSelection
  ) {
    this._axesCollection
      .getAxisForColIndex(colIndex)
      .setBrushSelection(newBrushSelection);
    this._linesCollection.recomputeForegroundLinesVisibility();
  }
  public onMouseMoved(newX: number, newY: number) {
    this._linesCollection.updatePeakedSessionGroup(
      this._linesCollection.findClosestSessionGroup(newX, newY)
    );
    this._peakedSessionGroupChangedCB(
      this._linesCollection.peakedSessionGroupHandle().sessionGroup()
    );
  }
  public onMouseLeave() {
    if (!this._linesCollection.peakedSessionGroupHandle().isNull()) {
      this._linesCollection.clearPeakedSessionGroup();
      this._peakedSessionGroupChangedCB(null);
    }
  }
  public onClick() {
    if (
      this._linesCollection.peakedSessionGroupHandle().sessionGroup() ===
      this._linesCollection.selectedSessionGroupHandle().sessionGroup()
    ) {
      /* If the selected session group is the same as the "peaked" one,
             clear the selection. */
      this._linesCollection.updateSelectedSessionGroup(
        new SessionGroupHandle()
      );
    } else {
      this._linesCollection.updateSelectedSessionGroup(
        this._linesCollection.peakedSessionGroupHandle()
      );
    }
    this._selectedSessionGroupChangedCB(
      this._linesCollection.selectedSessionGroupHandle().sessionGroup()!
    );
  }
  public onOptionsOrSessionGroupsChanged(
    newOptions: any,
    newSessionGroups: any[]
  ) {
    this._axesCollection.updateAxes(newOptions, newSessionGroups);
    const oldPeakedSessionGroupHandle =
      this._linesCollection.peakedSessionGroupHandle();
    const oldSelectedSessionGroupHandle =
      this._linesCollection.selectedSessionGroupHandle();
    this._linesCollection.redraw(
      newSessionGroups,
      newOptions.colorByColumnIndex !== undefined
        ? newOptions.columns[newOptions.colorByColumnIndex].absoluteIndex
        : null,
      newOptions.minColor,
      newOptions.maxColor
    );
    // A redraw may change the selected / peaked session group. So call the
    // appropriate callbacks if needed.
    if (
      !oldPeakedSessionGroupHandle.equalsTo(
        this._linesCollection.peakedSessionGroupHandle()
      )
    ) {
      this._peakedSessionGroupChangedCB(
        this._linesCollection.peakedSessionGroupHandle().sessionGroup()
      );
    }
    if (
      !oldSelectedSessionGroupHandle.equalsTo(
        this._linesCollection.selectedSessionGroupHandle()
      )
    ) {
      this._selectedSessionGroupChangedCB(
        this._linesCollection.selectedSessionGroupHandle().sessionGroup()
      );
    }
  }
  public schema(): tf_hparams_query_pane.Schema {
    return this._schema;
  }
  private _svgProps: SVGProperties;
  private _schema: tf_hparams_query_pane.Schema;
  private _peakedSessionGroupChangedCB: SessionGroupCallback;
  private _selectedSessionGroupChangedCB: SessionGroupCallback;
  private _axesCollection: AxesCollection;
  private _linesCollection: LinesCollection;
}
