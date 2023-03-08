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

/**
 * A D3-based implementation of a parallel-coordinates plot of the sessions
 * groups.
 *
 * This tf-hparams-parallel-coords-plot element displays a collection of
 * parallel vertical axes uniformally spaced with each axis corresponding to a
 * column--either an hyperparameter or a metric. Additionally each session
 * group is represented by a polyline whose vertices are points on the axes;
 * the vertex on the axis corresponding to a given column is the point on that
 * axis representing the column-value of the session group.
 *
 * Since the relations shown by the plot depends on the ordering of
 * the axes, the element allows re-ordering of the axes by dragging the axes
 * titles. For columns with a numeric domain (e.g. metrics), it allows
 * setting the scale of an axis to be 'linear', 'logarithmic' or 'quantile'.
 * The element also colors each line based on a given 'color-by' column value
 * of the represented session group. The 'color-by' column can be selected
 * to be any column with numeric domain.
 *
 * Finally, the user can filter the displayed session groups by "brushing"
 * axes. By clicking and dragging the mouse pointer vertically along an axis
 * the user can select part of the axes represented by a semi-transparent
 * overlay on the axis. We call that rectangle the brush-selection for the
 * axis. The user can cancel the brush-selection by clicking on the axis
 * outside the selection. Brush selections "filter" the polylines that are
 * displayed as follows. At any given time--for the axes that have a brush
 * selection--only the polylines that have each of these axes' vertices be
 * inside the axis' brush-selection are displayed colored; the rest
 * of the polylines are grayed-out.
 *
 * The implementation is based on the following cooperating classes:
 * + Defined in axes.ts:
 *   + Axis. Represents a single axis. Defined in axes.ts
 *   + AxesCollection. Represents the collection of axes. Responsible for
 *     handling axis drag and re-ordering behavior.
 * + Defined in lines.ts:
 *   + LinesCollection. Manages the collection of lines representing the session
 *     groups.
 * + Defind in interaction_manager.ts:
 *   + InteractionManager. Manages the interaction of entire plot with the user.
 *     Contains event handlers that respond to events in the DOM (such as an
 *     Axis being dragged) and calls appropriate methods in the other classes
 *     to update their state and redraw the necessary parts of the plot in
 *     response.
 *
 * See the individual class comments in the respective files for more details.
 */
import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as d3 from 'd3';
import * as _ from 'lodash';
import {DarkModeMixin} from '../../../components/polymer/dark_mode_mixin';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import '../tf_hparams_session_group_values/tf-hparams-session-group-values';
import {HparamInfo, MetricInfo, Schema} from '../tf_hparams_types/types';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';
import * as tf_hparams_parallel_coords_plot_interaction_manager from './interaction_manager';

interface Option {
  configuration: {
    columnsVisibility: boolean[];
    schema: Schema;
    visibleSchema: {
      hparamInfos: HparamInfo[];
      metricInfos: MetricInfo[];
    };
  };
}

@customElement('tf-hparams-parallel-coords-plot')
class TfHparamsParallelCoordsPlot extends LegacyElementMixin(
  DarkModeMixin(PolymerElement)
) {
  static readonly template = html`
    <div id="container">
      <svg id="svg"></svg>
    </div>
    <style>
      :host {
        display: block;
        --tf-hparams-parallel-coords-plot-axis-shadow: 0 1px 0 #fff,
          1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff;
      }
      :host(.dark-mode) {
        --tf-hparams-parallel-coords-plot-axis-shadow: 0 1px 0 #000,
          1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000;
      }
      svg {
        font: 10px sans-serif;
      }

      .background path {
        fill: none;
        stroke: #ddd;
        shape-rendering: crispEdges;
      }

      .foreground path {
        fill: none;
        stroke-opacity: 0.7;
        stroke-width: 1;
      }

      /* Will be set on foreground paths that are not "contained" in the current
         axes brushes. If no brushes are set, no path will have this class. */
      .foreground .invisible-path {
        display: none;
      }

      /* Style for the path closest to the mouse pointer (typically will become
      the selected path when the user clicks). */
      .foreground .peaked-path {
        stroke-width: 3;
      }

      /* The currently selected path class. We use !important to override the
         inline style that sets the regular color of a path. */
      .foreground .selected-path {
        stroke-width: 3 !important;
        stroke: #0f0 !important;
      }

      #container {
        height: 100%;
        width: 100%;
      }

      svg {
        width: 100%;
        height: 100%;
      }

      .axis text {
        text-shadow: var(--tf-hparams-parallel-coords-plot-axis-shadow);
        fill: currentColor;
        cursor: move;
      }
    </style>
  `;
  // See the property description in tf-hparams-query-pane.html
  @property({type: Array})
  sessionGroups: any[];

  // See the description in tf-hparams-scale-and-color-controls.html
  @property({type: Object})
  options: Option;

  private _prevOptions?: Option;

  // The last session group that was clicked on or null if no
  // session group was clicked on yet.
  /**
   * @type {?Object}
   */
  @property({
    type: Object,
    notify: true,
  })
  selectedSessionGroup: object | null = null;
  // The session group represented by the curve "closest" to the mouse
  // pointer (the corresponding path element will have the 'peaked-path'
  // class). If the closest session group distance is larger than a
  // threshold, this property will be null.
  /**
   * @type {?Object}
   */
  @property({
    type: Object,
    notify: true,
  })
  closestSessionGroup: object | null = null;
  // Counts the number of times the element has been redrawn since it
  // was created. This is incremented at the end of a redraw and allows
  // integration tests to wait for the element to finish redrawing.
  @property({
    type: Number,
  })
  redrawCount: number = 0;
  // An array containing just the "valid" session groups from
  // 'sessionGroups'. A session group is valid if every one of its metrics
  // and hyperparameters is populated. This element only displays valid
  // session groups. The elements here are not copies of sessionGroups
  // but refer to the same objects stored in the 'sessionGroups' property.
  @property({type: Array}) _validSessionGroups: any[] | undefined;
  // An InteractionManager object. Contains the logic driving this
  // element. Defined in tf-hparams-parallel-coords-plot.ts.
  @property({type: Object})
  _interactionManager: any;

  @observe('options.*', 'sessionGroups.*')
  _optionsOrSessionGroupsChanged() {
    if (!this.options) {
      return;
    }

    const {configuration: prevConfig} = this._prevOptions ?? {};
    const {configuration: nextConfig} = this.options;
    // See if we need to redraw from scratch. We redraw from scratch if
    // this is initialization or if configuration.schema has changed.
    if (
      this._interactionManager === undefined ||
      !_.isEqual(prevConfig?.schema, nextConfig.schema) ||
      !_.isEqual(prevConfig?.columnsVisibility, nextConfig.columnsVisibility)
    ) {
      // Remove any pre-existing DOM children of our SVG.
      d3.select(this.$.svg as SVGElement)
        .selectAll('*')
        .remove();
      const svgProps =
        new tf_hparams_parallel_coords_plot_interaction_manager.SVGProperties(
          this.$.svg as HTMLElement,
          nextConfig.columnsVisibility.filter(Boolean).length
        );
      // Listen to DOM changes underneath this.$.svg, and apply local CSS
      // scoping rules so that our rules in the <style> section above
      // would apply.
      this.scopeSubtree(this.$.svg as SVGElement, true);
      this._interactionManager =
        new tf_hparams_parallel_coords_plot_interaction_manager.InteractionManager(
          svgProps,
          nextConfig.schema,
          (sessionGroup) => this.closestSessionGroupChanged(sessionGroup),
          (sessionGroup) => this.selectedSessionGroupChanged(sessionGroup)
        );
    }
    this._computeValidSessionGroups();
    this._interactionManager.onOptionsOrSessionGroupsChanged(
      this.options,
      this._validSessionGroups
    );
    this.redrawCount++;
    this._prevOptions = this.options;
  }
  closestSessionGroupChanged(sessionGroup) {
    this.closestSessionGroup = sessionGroup;
  }
  selectedSessionGroupChanged(sessionGroup) {
    this.selectedSessionGroup = sessionGroup;
  }
  // computes validSessionGroups: Filters out the session groups in the
  // sessionGroups that have one or more of their column values undefined.
  // If sessionGroups is undefined sets validSessionGroups to be
  // undefined as well. (This can happen during testing when we don't set
  // the sessionGroups property).
  _computeValidSessionGroups() {
    const utils = tf_hparams_utils;
    if (this.sessionGroups === undefined) {
      this._validSessionGroups = undefined;
      return;
    }
    const schema = this.options.configuration.schema;
    this._validSessionGroups = this.sessionGroups.filter((sg) => {
      for (let colIndex = 0; colIndex < utils.numColumns(schema); ++colIndex) {
        if (!this.options.configuration.columnsVisibility[colIndex]) {
          continue;
        }
        const columnValue = utils.columnValueByIndex(schema, sg, colIndex);
        if (columnValue === undefined || columnValue === 'NaN') {
          return false;
        }
      }
      return true;
    });
  }
}
