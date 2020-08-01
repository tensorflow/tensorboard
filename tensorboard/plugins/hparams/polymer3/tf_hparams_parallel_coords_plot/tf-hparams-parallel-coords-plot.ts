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

import {PolymerElement, html} from '@polymer/polymer';
import {customElement, property} from '@polymer/decorators';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-imports/d3.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-utils/tf-hparams-utils.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-session-group-values/tf-hparams-session-group-values.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-parallel-coords-plot/utils.html';
import {DO_NOT_SUBMIT} from 'axes';
import {DO_NOT_SUBMIT} from 'lines';
import {DO_NOT_SUBMIT} from 'interaction_manager';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-imports/d3.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-utils/tf-hparams-utils.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-session-group-values/tf-hparams-session-group-values.html';
import {DO_NOT_SUBMIT} from '../tf-hparams-parallel-coords-plot/utils.html';
import {DO_NOT_SUBMIT} from 'axes';
import {DO_NOT_SUBMIT} from 'lines';
import {DO_NOT_SUBMIT} from 'interaction_manager';
@customElement('tf-hparams-parallel-coords-plot')
class TfHparamsParallelCoordsPlot extends PolymerElement {
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
        text-shadow: 0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff;
        fill: #000;
        cursor: move;
      }
    </style>
  `;
  @property({type: Array})
  sessionGroups: unknown[];
  @property({type: Object})
  options: object;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  selectedSessionGroup: object = null;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  closestSessionGroup: object = null;
  @property({
    type: Number,
  })
  redrawCount: number = 0;
  @property({type: Array})
  _validSessionGroups: unknown[];
  @property({type: Object})
  _interactionManager: object;
  @observe('options.*', 'sessionGroups.*')
  _optionsOrSessionGroupsChanged() {
    if (!this.options) {
      return;
    }
    const configuration = this.options.configuration;
    // See if we need to redraw from scratch. We redraw from scratch if
    // this is initialization or if configuration.schema has changed.
    if (
      this._interactionManager === undefined ||
      !_.isEqual(this._interactionManager.schema(), configuration.schema)
    ) {
      // Remove any pre-existing DOM children of our SVG.
      d3.select(this.$.svg)
        .selectAll('*')
        .remove();
      const svgProps = new tf.hparams.parallel_coords_plot.SVGProperties(
        this.$.svg,
        tf.hparams.utils.numColumns(configuration.schema)
      );
      // Listen to DOM changes underneath this.$.svg, and apply local CSS
      // scoping rules so that our rules in the <style> section above
      // would apply.
      this.scopeSubtree(this.$.svg, true);
      this._interactionManager = new tf.hparams.parallel_coords_plot.InteractionManager(
        svgProps,
        configuration.schema,
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
  }
  closestSessionGroupChanged(sessionGroup) {
    this._setClosestSessionGroup(sessionGroup);
  }
  selectedSessionGroupChanged(sessionGroup) {
    this._setSelectedSessionGroup(sessionGroup);
  }
  // computes validSessionGroups: Filters out the session groups in the
  // sessionGroups that have one or more of their column values undefined.
  // If sessionGroups is undefined sets validSessionGroups to be
  // undefined as well. (This can happen during testing when we don't set
  // the sessionGroups property).
  _computeValidSessionGroups() {
    const utils = tf.hparams.utils;
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
        if (utils.columnValueByIndex(schema, sg, colIndex) === undefined) {
          return false;
        }
      }
      return true;
    });
  }
}
