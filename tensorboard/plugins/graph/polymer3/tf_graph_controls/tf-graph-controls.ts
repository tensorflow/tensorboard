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
import '@polymer/iron-icon';
import '@polymer/paper-button';
import '@polymer/paper-dropdown-menu';
import '@polymer/paper-icon-button';
import '@polymer/paper-item';
import '@polymer/paper-listbox';
import '@polymer/paper-radio-group';
import '@polymer/paper-toggle-button';
import '@polymer/paper-tooltip';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tensorboard-color.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-icon.html';
import {DO_NOT_SUBMIT} from '../tf-graph-node-search/tf-graph-node-search.html';
import {DO_NOT_SUBMIT} from 'tf-graph-controls';
import '@polymer/iron-icon';
import '@polymer/paper-button';
import '@polymer/paper-dropdown-menu';
import '@polymer/paper-icon-button';
import '@polymer/paper-item';
import '@polymer/paper-listbox';
import '@polymer/paper-radio-group';
import '@polymer/paper-toggle-button';
import '@polymer/paper-tooltip';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tensorboard-color.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-icon.html';
import {DO_NOT_SUBMIT} from '../tf-graph-node-search/tf-graph-node-search.html';
interface DeviceNameExclude {
  regex: RegExp;
}
const DEVICE_NAME_REGEX = /device:([^:]+:[0-9]+)$/;
/**
 * Display only devices matching one of the following regex.
 */
const DEVICE_NAMES_INCLUDE: DeviceNameExclude[] = [
  {
    // Don't include GPU stream, memcpy, etc. devices
    regex: DEVICE_NAME_REGEX,
  },
];
interface StatsDefaultOff {
  regex: RegExp;
  msg: string; // 'Excluded by default since...'
}
/**
 * Stats from device names that match these regexes will be disabled by default.
 * The user can still turn on a device by selecting the checkbox in the device list.
 */
const DEVICE_STATS_DEFAULT_OFF: StatsDefaultOff[] = [];
export interface Selection {
  run: string;
  tag: string | null;
  type: tf.graph.SelectionType;
}
export interface DeviceForStats {
  [key: string]: boolean;
}
// TODO(stephanwlee): Move this to tf-graph-dashboard
export interface TagItem {
  tag: string | null;
  displayName: string;
  conceptualGraph: boolean;
  opGraph: boolean;
  profile: boolean;
}
// TODO(stephanwlee): Move this to tf-graph-dashboard
export interface RunItem {
  name: string;
  tags: TagItem[];
}
// TODO(stephanwlee): Move this to tf-graph-dashboard
export type Dataset = Array<RunItem>;
interface CurrentDevice {
  device: string;
  suffix: string;
  used: boolean;
  ignoredMsg: string | null;
}
export enum ColorBy {
  COMPUTE_TIME = 'compute_time',
  MEMORY = 'memory',
  STRUCTURE = 'structure',
  XLA_CLUSTER = 'xla_cluster',
  OP_COMPATIBILITY = 'op_compatibility',
}
interface ColorParams {
  minValue: number;
  maxValue: number;
  // HEX value describing color.
  startColor: string;
  // HEX value describing color.
  endColor: string;
}
interface DeviceColor {
  device: string;
  color: string;
}
interface XlaClusterColor {
  xla_cluster: string;
  color: string;
}
// TODO(stephanwlee) Move this to tf-graph.html when it becomes TypeScript.
interface ColorByParams {
  compute_time: ColorParams;
  memory: ColorParams;
  device: DeviceColor[];
  xla_cluster: XlaClusterColor[];
}
const GRADIENT_COMPATIBLE_COLOR_BY: Set<ColorBy> = new Set([
  ColorBy.COMPUTE_TIME,
  ColorBy.MEMORY,
]);
@customElement('tf-graph-controls')
class TfGraphControls extends PolymerElement {
  static readonly template = html`
    <style>
      :host {
        color: gray;
        display: flex;
        flex-direction: column;
        font-size: 12px;
        width: 100%;
      }

      paper-dropdown-menu {
        --paper-dropdown-menu-input: {
          padding: 0;
          color: gray;
        }
        --iron-icon-width: 15px;
        --iron-icon-height: 15px;
        --primary-text-color: gray;
        --paper-item-min-height: 30px;
      }

      paper-button[raised].keyboard-focus {
        font-weight: normal;
      }

      .run-dropdown {
        --paper-input-container: {
          padding: 8px 0 8px 10px;
        }
      }

      .color-dropdown {
        --paper-input-container: {
          padding: 9px 0 0 13px;
        }
      }

      table {
        border-collapse: collapse;
        border-spacing: 0;
      }

      table td {
        padding: 0;
        margin: 0;
      }

      .allcontrols {
        padding: 0 20px 20px;
        flex-grow: 1;
        overflow-y: auto;
      }

      .legend-holder {
        background: #e9e9e9;
        border-top: 1px solid #ccc;
        box-sizing: border-box;
        color: #555;
        padding: 15px 20px;
        width: 100%;
      }

      .toggle-legend-button {
        max-height: 20px;
        max-width: 20px;
        padding: 0;
      }

      .toggle-legend-text {
        vertical-align: middle;
      }

      paper-radio-button {
        display: block;
        padding: 5px;
      }
      svg.icon,
      tf-graph-icon {
        width: 60px;
        height: 18px;
      }
      .domainValues {
        margin-bottom: 10px;
        width: 165px;
      }
      .domainStart {
        float: left;
      }
      .domainEnd {
        float: right;
      }
      .colorBox {
        width: 20px;
      }

      .image-icon {
        width: 24px;
        height: 24px;
      }

      .help-icon {
        height: 15px;
        margin: 0;
        padding: 0;
      }

      .gray {
        color: #666;
      }

      .title {
        font-size: 16px;
        margin: 8px 5px 8px 0;
        color: black;
      }
      .title small {
        font-weight: normal;
      }
      .deviceList,
      .xlaClusterList {
        max-height: 200px;
        overflow-y: auto;
      }

      #file {
        padding: 8px 0;
      }

      .color-legend-row {
        align-items: center;
        clear: both;
        display: flex;
        height: 20px;
        margin-top: 5px;
      }

      .color-legend-row .label,
      .color-legend-row svg,
      .color-legend-row tf-graph-icon {
        flex: 0 0 40px;
        margin-right: 20px;
      }

      .devices-checkbox input {
        text-align: left;
        vertical-align: middle;
      }

      .control-holder .icon-button {
        font-size: 14px;
        margin: 0 -5px;
        padding: 5px;
      }

      .button-text {
        padding-left: 20px;
        text-transform: none;
      }

      .upload-button {
        width: 165px;
        height: 25px;
        text-transform: none;
        margin-top: 4px;
      }

      .button-icon {
        width: 26px;
        height: 26px;
        color: var(--paper-orange-500);
      }

      .hidden-input {
        height: 0px;
        width: 0px;
        overflow: hidden;
      }

      .allcontrols .control-holder {
        clear: both;
        display: flex;
        justify-content: space-between;
      }

      .allcontrols .control-holder paper-radio-group {
        margin-top: 5px;
      }

      span.counter {
        font-size: 13px;
        color: gray;
      }

      .runs paper-item {
        --paper-item: {
          white-space: nowrap;
        }
      }

      table.control-holder {
        border: 0;
        border-collapse: collapse;
      }

      table.tf-graph-controls td.input-element-table-data {
        padding: 0 0 0 20px;
      }

      .spacer {
        flex-grow: 1;
      }

      .color-text {
        overflow: hidden;
      }

      /** Override inline styles that suppress pointer events for disabled buttons. Otherwise, the */
      /*  tooltips do not appear. */
      paper-radio-group paper-radio-button {
        pointer-events: auto !important;
      }

      .legend-clarifier {
        color: #266236;
        cursor: help;
        display: inline-block;
        text-decoration: underline;
      }

      .legend-clarifier paper-tooltip {
        width: 150px;
      }

      /** Otherwise, polymer UI controls appear atop node search. */
      tf-graph-node-search {
        z-index: 1;
        width: 100%;
      }

      paper-dropdown-menu {
        flex-grow: 1;
      }
    </style>

    <div class="allcontrols">
      <div class="control-holder">
        <tf-graph-node-search
          selected-node="{{selectedNode}}"
          render-hierarchy="[[renderHierarchy]]"
        ></tf-graph-node-search>
      </div>
      <div class="control-holder">
        <paper-button class="icon-button" on-tap="_fit" alt="Fit to screen">
          <iron-icon icon="aspect-ratio" class="button-icon"></iron-icon>
          <span class="button-text">Fit to Screen</span>
        </paper-button>
      </div>
      <div class="control-holder">
        <paper-button
          class="icon-button"
          on-click="download"
          alt="Download PNG"
        >
          <iron-icon icon="file-download" class="button-icon"></iron-icon>
          <span class="button-text">Download PNG</span>
        </paper-button>
        <a href="#" id="graphdownload" class="title" download="graph.png"></a>
      </div>
      <div class="control-holder runs">
        <div class="title">
          Run <span class="counter">([[datasets.length]])</span>
        </div>
        <paper-dropdown-menu
          no-label-float=""
          no-animations=""
          noink=""
          horizontal-align="left"
          class="run-dropdown"
        >
          <paper-listbox
            class="dropdown-content"
            selected="{{_selectedRunIndex}}"
            slot="dropdown-content"
          >
            <template is="dom-repeat" items="[[datasets]]">
              <paper-item>[[item.name]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      <template is="dom-if" if="[[showSessionRunsDropdown]]">
        <div class="control-holder">
          <div class="title">
            Tag
            <span class="counter"
              >([[_numTags(datasets, _selectedRunIndex)]])</span
            >
          </div>
          <paper-dropdown-menu
            no-label-float=""
            no-animations=""
            horizontal-align="left"
            noink=""
            class="run-dropdown"
          >
            <paper-listbox
              class="dropdown-content"
              selected="{{_selectedTagIndex}}"
              slot="dropdown-content"
            >
              <template
                is="dom-repeat"
                items="[[_getTags(datasets, _selectedRunIndex)]]"
              >
                <paper-item>[[item.displayName]]</paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
      </template>
      <template is="dom-if" if="[[showUploadButton]]">
        <div class="control-holder">
          <div class="title">Upload</div>
          <paper-button
            raised=""
            class="upload-button"
            on-click="_getFile"
            title="Upload a graph pbtxt file to view the graph"
          >
            Choose File
          </paper-button>
          <div class="hidden-input">
            <input
              type="file"
              id="file"
              name="file"
              on-change="_updateFileInput"
              accept=".pbtxt"
            />
          </div>
        </div>
      </template>
      <div class="control-holder">
        <paper-radio-group selected="{{_selectedGraphType}}">
          <!-- Note that the name has to match that of tf.graph.SelectionType. -->
          <paper-radio-button
            name="op_graph"
            disabled="[[_getSelectionOpGraphDisabled(datasets, _selectedRunIndex, _selectedTagIndex)]]"
            >Graph</paper-radio-button
          >
          <paper-radio-button
            name="conceptual_graph"
            disabled="[[_getSelectionConceptualGraphDisabled(datasets, _selectedRunIndex, _selectedTagIndex)]]"
            >Conceptual Graph</paper-radio-button
          >
          <paper-radio-button
            name="profile"
            disabled="[[_getSelectionProfileDisabled(datasets, _selectedRunIndex, _selectedTagIndex)]]"
            >Profile</paper-radio-button
          >
        </paper-radio-group>
      </div>
      <div class="control-holder">
        <div>
          <paper-toggle-button checked="{{traceInputs}}" class="title">
            Trace inputs
          </paper-toggle-button>
        </div>
      </div>
      <template is="dom-if" if="[[healthPillsFeatureEnabled]]">
        <div class="control-holder">
          <paper-toggle-button checked="{{healthPillsToggledOn}}" class="title"
            >Show health pills</paper-toggle-button
          >
        </div>
      </template>
      <div class="control-holder">
        <div class="title">Color</div>
        <paper-radio-group selected="{{colorBy}}">
          <paper-radio-button name="structure">Structure</paper-radio-button>

          <paper-radio-button name="device">Device</paper-radio-button>

          <paper-radio-button
            id="xla-cluster-radio-button"
            name="xla_cluster"
            disabled="[[!_xlaClustersProvided(renderHierarchy)]]"
          >
            XLA Cluster
          </paper-radio-button>
          <paper-tooltip
            animation-delay="0"
            for="xla-cluster-radio-button"
            position="right"
            offset="0"
          >
            Coloring by XLA cluster is only enabled if at least 1 op specifies
            an XLA cluster.
          </paper-tooltip>

          <paper-radio-button
            id="compute-time-radio-button"
            name="compute_time"
            disabled="[[!stats]]"
          >
            Compute time
          </paper-radio-button>
          <paper-tooltip
            animation-delay="0"
            for="compute-time-radio-button"
            position="right"
            offset="0"
          >
            Coloring by compute time is only enabled if the RunMetadata proto is
            passed to the FileWriter when a specific session is run.
          </paper-tooltip>

          <paper-radio-button
            id="memory-radio-button"
            name="memory"
            disabled="[[!stats]]"
          >
            Memory
          </paper-radio-button>
          <paper-tooltip
            animation-delay="0"
            for="memory-radio-button"
            position="right"
            offset="0"
          >
            Coloring by memory is only enabled if the RunMetadata proto is
            passed to the FileWriter when a specific session is run.
          </paper-tooltip>

          <paper-radio-button
            id="tpu-compatibility-radio-button"
            name="op_compatibility"
          >
            TPU Compatibility
          </paper-radio-button>
          <paper-tooltip
            animation-delay="0"
            for="tpu-compatibility-radio-button"
            position="right"
            offset="0"
          >
            Coloring by whether an operation is compatible for the TPU device.
          </paper-tooltip>
        </paper-radio-group>
        <span class="spacer"></span>
      </div>
      <div>
        <template is="dom-if" if="[[_isGradientColoring(stats, colorBy)]]">
          <svg width="140" height="20" style="margin: 0 5px" class="color-text">
            <defs>
              <linearGradient
                id="linearGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  class="start"
                  offset="0%"
                  stop-color$="[[_currentGradientParams.startColor]]"
                ></stop>
                <stop
                  class="end"
                  offset="100%"
                  stop-color$="[[_currentGradientParams.endColor]]"
                ></stop>
              </linearGradient>
            </defs>
            <rect
              x="0"
              y="0"
              width="135"
              height="20"
              fill="url(#linearGradient)"
              stroke="black"
            ></rect>
          </svg>
          <div class="domainValues color-text">
            <div class="domainStart">[[_currentGradientParams.minValue]]</div>
            <div class="domainEnd">[[_currentGradientParams.maxValue]]</div>
          </div>
          <br style="clear: both" />
          <div>Devices included in stats:</div>
          <div class="deviceList">
            <template is="dom-repeat" items="[[_currentDevices]]">
              <div class="color-legend-row devices-checkbox">
                <span
                  ><input
                    type="checkbox"
                    value$="[[item.device]]"
                    checked$="[[item.used]]"
                    on-click="_deviceCheckboxClicked"
                /></span>
                <span>[[item.suffix]]</span>
                <template is="dom-if" if="[[item.ignoredMsg]]">
                  <paper-icon-button
                    icon="help"
                    class="help-icon"
                  ></paper-icon-button>
                  <paper-tooltip position="right" offset="0" animation-delay="0"
                    >[[item.ignoredMsg]]</paper-tooltip
                  >
                </template>
              </div>
            </template>
          </div>
        </template>
        <template is="dom-if" if="[[_equals(colorBy, 'structure')]]">
          <div class="color-text">
            <div class="color-legend-row">
              <span class="label">
                colors
              </span>
              <span class="color-legend-value">same substructure</span>
            </div>
            <div class="color-legend-row">
              <tf-graph-icon
                type="META"
                height="16"
                fill-override="#eee"
                stroke-override="#a6a6a6"
              ></tf-graph-icon>
              <span class="color-legend-value">unique substructure</span>
            </div>
          </div>
        </template>
        <template is="dom-if" if="[[_equals(colorBy, 'device')]]">
          <div>
            <template is="dom-repeat" items="[[_currentDeviceParams]]">
              <div class="color-legend-row">
                <tf-graph-icon
                  type="META"
                  height="16"
                  fill-override="[[item.color]]"
                  stroke-override="#a6a6a6"
                ></tf-graph-icon>
                <span class="color-legend-value">[[item.device]]</span>
              </div>
            </template>
            <div class="color-legend-row">
              <tf-graph-icon
                type="META"
                height="16"
                fill-override="#eee"
                stroke-override="#a6a6a6"
              ></tf-graph-icon>
              <span class="color-legend-value">unknown device</span>
            </div>
          </div>
        </template>
        <template is="dom-if" if="[[_equals(colorBy, 'xla_cluster')]]">
          <div>
            <template is="dom-repeat" items="[[_currentXlaClusterParams]]">
              <div class="color-legend-row">
                <svg>
                  <use
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    xlink:href="#unfilled-rect"
                    x="0"
                    y="0"
                    style="fill:[[item.color]]"
                  ></use>
                </svg>
                <span class="color-legend-value">[[item.xla_cluster]]</span>
              </div>
            </template>
            <div class="color-legend-row">
              <svg>
                <use
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  xlink:href="#grey-rect"
                  x="0"
                  y="0"
                ></use>
              </svg>
              <span class="color-legend-value">unknown XLA cluster</span>
            </div>
          </div>
        </template>
        <template is="dom-if" if="[[_equals(colorBy, 'op_compatibility')]]">
          <div class="color-text">
            <div class="color-legend-row">
              <tf-graph-icon
                type="OP"
                height="16"
                fill-override="#0f9d58"
                stroke-override="#ccc"
              ></tf-graph-icon>
              <span class="color-legend-value">Valid Op</span>
            </div>
            <div class="color-legend-row">
              <tf-graph-icon
                type="OP"
                height="16"
                fill-override="#db4437"
                stroke-override="#ccc"
              ></tf-graph-icon>
              <span class="color-legend-value">Invalid Op</span>
            </div>
          </div>
        </template>
        <template is="dom-if" if="[[_statsNotNull(stats)]]">
          <div class="color-legend-row">
            <tf-graph-icon type="META" height="16" faded=""></tf-graph-icon>
            <span class="color-legend-value">unused substructure</span>
          </div>
        </template>
      </div>
    </div>
    <div class="legend-holder">
      <paper-icon-button
        icon="[[_getToggleLegendIcon(_legendOpened)]]"
        on-click="_toggleLegendOpen"
        class="toggle-legend-button"
      >
      </paper-icon-button>
      <span class="toggle-legend-text">
        [[_getToggleText(_legendOpened)]]
      </span>
      <iron-collapse opened="[[_legendOpened]]">
        <div>
          <table>
            <tbody>
              <tr>
                <td><div class="title">Graph</div></td>
                <td>(* = expandable)</td>
              </tr>
              <tr>
                <td>
                  <tf-graph-icon
                    type="META"
                    height="16"
                    fill-override="#d9d9d9"
                    stroke-override="#ccc"
                  ></tf-graph-icon>
                </td>
                <td>
                  Namespace<span class="gray">*</span>
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Encapsulates a set of nodes. Namespace is hierarchical and
                      based on scope.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <tf-graph-icon type="OP" height="16"></tf-graph-icon>
                </td>
                <td>
                  OpNode
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Node that performs an operation. These nodes cannot
                      expand.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <tf-graph-icon type="SERIES" height="16"></tf-graph-icon>
                </td>
                <td>
                  Unconnected series<span class="gray">*</span>
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Sequence of numbered nodes that are not connected to each
                      other.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <tf-graph-icon
                    type="SERIES"
                    height="16"
                    vertical=""
                  ></tf-graph-icon>
                </td>
                <td>
                  Connected series<span class="gray">*</span>
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Sequence of numbered nodes that are connected to each
                      other.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <svg class="icon">
                    <circle
                      fill="white"
                      stroke="#848484"
                      cx="10"
                      cy="10"
                      r="5"
                    ></circle>
                  </svg>
                </td>
                <td>
                  Constant
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Node that outputs a constant value.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <tf-graph-icon type="SUMMARY" height="20"></tf-graph-icon>
                </td>
                <td>
                  Summary
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Node that collects data for visualization within
                      TensorBoard.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <svg
                    class="icon"
                    height="15px"
                    preserveAspectRatio="xMinYMid meet"
                    viewBox="0 0 15 15"
                  >
                    <defs>
                      <marker
                        id="dataflow-arrowhead-legend"
                        fill="#bbb"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="5"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0,0 L 10,5 L 0,10 C 3,7 3,3 0,0"></path>
                      </marker>
                    </defs>
                    <path
                      marker-end="url(#dataflow-arrowhead-legend)"
                      stroke="#bbb"
                      d="M2 9 l 29 0"
                      stroke-linecap="round"
                    ></path>
                  </svg>
                </td>
                <td>
                  Dataflow edge
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Edge showing the data flow between operations. Edges flow
                      upwards unless arrowheads specify otherwise.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <svg
                    class="icon"
                    height="15px"
                    preserveAspectRatio="xMinYMid meet"
                    viewBox="0 0 15 15"
                  >
                    <path
                      stroke="#bbb"
                      d="M2 9 l 29 0"
                      stroke-linecap="round"
                      stroke-dasharray="2, 2"
                    ></path>
                  </svg>
                </td>
                <td>
                  Control dependency edge
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Edge showing the control dependency between operations.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <svg
                    class="icon"
                    height="15px"
                    preserveAspectRatio="xMinYMid meet"
                    viewBox="0 0 15 15"
                  >
                    <defs>
                      <marker
                        id="reference-arrowhead-legend"
                        fill="#FFB74D"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="5"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0,0 L 10,5 L 0,10 C 3,7 3,3 0,0"></path>
                      </marker>
                    </defs>
                    <path
                      marker-end="url(#reference-arrowhead-legend)"
                      stroke="#FFB74D"
                      d="M2 9 l 29 0"
                      stroke-linecap="round"
                    ></path>
                  </svg>
                </td>
                <td>
                  Reference edge
                  <div class="legend-clarifier">
                    <span>?</span>
                    <paper-tooltip
                      animation-delay="0"
                      position="right"
                      offset="0"
                    >
                      Edge showing that the outgoing operation node can mutate
                      the incoming tensor.
                    </paper-tooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </iron-collapse>
    </div>
  `;
  @property({
    type: Object,
    observer: '_statsChanged',
  })
  stats: object = null;
  @property({
    type: Object,
    notify: true,
    // TODO(stephanwlee): Change readonly -> readOnly and fix the setter.
    readonly: true,
  })
  devicesForStats: object = null;
  @property({
    type: String,
    notify: true,
  })
  colorBy: string = ColorBy.STRUCTURE;
  @property({
    type: Object,
    notify: true,
    // TODO(stephanwlee): Change readonly -> readOnly and fix the setter.
    readonly: true,
  })
  colorByParams: object;
  @property({
    type: Array,
    observer: '_datasetsChanged',
  })
  datasets: unknown[] = () => [];
  @property({
    type: Object,
  })
  renderHierarchy: object;
  @property({
    type: Object,
    notify: true,
    readOnly: true,
    computed:
      '_computeSelection(datasets, _selectedRunIndex, _selectedTagIndex, _selectedGraphType)',
  })
  selection: object;
  @property({
    type: Object,
    notify: true,
  })
  selectedFile: object;
  @property({
    type: Number,
    observer: '_selectedRunIndexChanged',
  })
  _selectedRunIndex: number = 0;
  @property({
    type: Boolean,
    notify: true,
  })
  traceInputs: boolean = false;
  @property({
    type: Number,
    observer: '_selectedTagIndexChanged',
  })
  _selectedTagIndex: number = 0;
  @property({
    type: String,
  })
  _selectedGraphType: string = tf.graph.SelectionType.OP_GRAPH;
  @property({
    type: String,
    notify: true,
  })
  selectedNode: string;
  @property({
    type: Boolean,
  })
  showSessionRunsDropdown: boolean = true;
  @property({
    type: Boolean,
  })
  showUploadButton: boolean = true;
  @property({type: Boolean})
  healthPillsFeatureEnabled: boolean;
  @property({
    type: Boolean,
    notify: true,
  })
  healthPillsToggledOn: boolean;
  @property({
    type: Boolean,
  })
  _legendOpened: boolean = true;
  _xlaClustersProvided(
    renderHierarchy: tf.graph.render.RenderGraphInfo | null
  ) {
    return (
      renderHierarchy &&
      renderHierarchy.hierarchy &&
      renderHierarchy.hierarchy.xlaClusters.length > 0
    );
  }
  _statsChanged(stats: tf.graph.proto.StepStats) {
    if (stats == null) {
      return;
    }
    var devicesForStats = {};
    var devices = _.each(stats.dev_stats, function(d) {
      // Only considered included devices.
      var include = _.some(DEVICE_NAMES_INCLUDE, function(rule) {
        return rule.regex.test(d.device);
      });
      // Exclude device names that are ignored by default.
      var exclude = _.some(DEVICE_STATS_DEFAULT_OFF, function(rule) {
        return rule.regex.test(d.device);
      });
      if (include && !exclude) {
        devicesForStats[d.device] = true;
      }
    });
    this.set('devicesForStats', devicesForStats);
  }
  @computed('devicesForStats')
  get _currentDevices(): unknown[] {
    var devicesForStats = this.devicesForStats;
    const stats: tf.graph.proto.StepStats | null = this.stats;
    const devStats: tf.graph.proto.DevStat[] = stats ? stats.dev_stats : [];
    const allDevices = devStats.map((d) => d.device);
    const devices = allDevices.filter((deviceName) => {
      return DEVICE_NAMES_INCLUDE.some((rule) => {
        return rule.regex.test(deviceName);
      });
    });
    // Devices names can be long so we remove the longest common prefix
    // before showing the devices in a list.
    const suffixes = tf.graph.util.removeCommonPrefix(devices);
    if (suffixes.length == 1) {
      const found = suffixes[0].match(DEVICE_NAME_REGEX);
      if (found) {
        suffixes[0] = found[1];
      }
    }
    return devices.map((device, i) => {
      let ignoredMsg = null;
      // TODO(stephanwlee): this should probably bail on the first match or
      // do something useful with multiple rule.msgs.
      DEVICE_STATS_DEFAULT_OFF.forEach((rule) => {
        if (rule.regex.test(device)) {
          ignoredMsg = rule.msg;
        }
      });
      return {
        device: device,
        suffix: suffixes[i],
        used: devicesForStats[device],
        ignoredMsg: ignoredMsg,
      };
    });
  }
  _deviceCheckboxClicked(event: Event) {
    // Update the device map.
    const input = event.target as HTMLInputElement;
    const devicesForStats: DeviceForStats = Object.assign(
      {},
      this.devicesForStats
    );
    const device = input.value;
    if (input.checked) {
      devicesForStats[device] = true;
    } else {
      delete devicesForStats[device];
    }
    this.set('devicesForStats', devicesForStats);
  }
  _numTags(datasets: Dataset, _selectedRunIndex: number) {
    return this._getTags(datasets, _selectedRunIndex).length;
  }
  _getTags(datasets: Dataset, _selectedRunIndex: number) {
    if (!datasets || !datasets[_selectedRunIndex]) {
      return [];
    }
    return datasets[_selectedRunIndex].tags;
  }
  _fit() {
    this.fire('fit-tap');
  }
  _isGradientColoring(stats: tf.graph.proto.StepStats, colorBy: ColorBy) {
    return GRADIENT_COMPATIBLE_COLOR_BY.has(colorBy) && stats != null;
  }
  _equals(a: any, b: any) {
    return a === b;
  }
  @computed('colorByParams')
  get _currentDeviceParams(): unknown[] {
    var colorByParams = this.colorByParams;
    const deviceParams = colorByParams.device.filter((param) => {
      return DEVICE_NAMES_INCLUDE.some((rule) => {
        return rule.regex.test(param.device);
      });
    });
    // Remove common prefix and merge back corresponding color. If
    // there is only one device then remove everything up to "/device:".
    const suffixes = tf.graph.util.removeCommonPrefix(
      deviceParams.map((d) => d.device)
    );
    if (suffixes.length == 1) {
      var found = suffixes[0].match(DEVICE_NAME_REGEX);
      if (found) {
        suffixes[0] = found[1];
      }
    }
    return deviceParams.map((d, i) => {
      return {device: suffixes[i], color: d.color};
    });
  }
  @computed('colorByParams')
  get _currentXlaClusterParams(): unknown[] {
    var colorByParams = this.colorByParams;
    return colorByParams.xla_cluster;
  }
  @computed('colorByParams', 'colorBy')
  get _currentGradientParams(): object {
    var colorByParams = this.colorByParams;
    var colorBy = this.colorBy;
    if (!this._isGradientColoring(this.stats, colorBy)) {
      return;
    }
    const params: ColorParams = colorByParams[colorBy];
    let minValue = params.minValue;
    let maxValue = params.maxValue;
    if (colorBy === ColorBy.MEMORY) {
      minValue = tf.graph.util.convertUnitsToHumanReadable(
        minValue,
        tf.graph.util.MEMORY_UNITS
      );
      maxValue = tf.graph.util.convertUnitsToHumanReadable(
        maxValue,
        tf.graph.util.MEMORY_UNITS
      );
    } else if (colorBy === ColorBy.COMPUTE_TIME) {
      minValue = tf.graph.util.convertUnitsToHumanReadable(
        minValue,
        tf.graph.util.TIME_UNITS
      );
      maxValue = tf.graph.util.convertUnitsToHumanReadable(
        maxValue,
        tf.graph.util.TIME_UNITS
      );
    }
    return {
      minValue,
      maxValue,
      startColor: params.startColor,
      endColor: params.endColor,
    };
  }
  download() {
    this.$.graphdownload.click();
  }
  _updateFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files[0];
    if (!file) return;
    // Strip off everything before the last "/" and strip off the file
    // extension in order to get the name of the PNG for the graph.
    let filePath = file.name;
    const dotIndex = filePath.lastIndexOf('.');
    if (dotIndex >= 0) {
      filePath = filePath.substring(0, dotIndex);
    }
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex >= 0) {
      filePath = filePath.substring(lastSlashIndex + 1);
    }
    this._setDownloadFilename(filePath);
    this.set('selectedFile', e);
  }
  _datasetsChanged(newDatasets: Dataset, oldDatasets: Dataset) {
    if (oldDatasets != null) {
      // Select the first dataset by default.
      this._selectedRunIndex = 0;
    }
  }
  _computeSelection(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number,
    _selectedGraphType: tf.graph.SelectionType
  ) {
    if (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex]
    ) {
      return null;
    }
    return {
      run: datasets[_selectedRunIndex].name,
      tag: datasets[_selectedRunIndex].tags[_selectedTagIndex].tag,
      type: _selectedGraphType,
    };
  }
  _selectedRunIndexChanged(runIndex: number) {
    if (!this.datasets) return;
    // Reset the states when user pick a different run.
    this.colorBy = ColorBy.STRUCTURE;
    this._selectedTagIndex = 0;
    this._selectedGraphType = this._getDefaultSelectionType();
    this.traceInputs = false; // Set trace input to off-state.
    this._setDownloadFilename(
      this.datasets[runIndex] ? this.datasets[runIndex].name : ''
    );
  }
  _selectedTagIndexChanged(): void {
    this._selectedGraphType = this._getDefaultSelectionType();
  }
  _getDefaultSelectionType(): tf.graph.SelectionType {
    const {datasets, _selectedRunIndex: run, _selectedTagIndex: tag} = this;
    if (
      !datasets ||
      !datasets[run] ||
      !datasets[run].tags[tag] ||
      datasets[run].tags[tag].opGraph
    ) {
      return tf.graph.SelectionType.OP_GRAPH;
    }
    if (datasets[run].tags[tag].profile) {
      return tf.graph.SelectionType.PROFILE;
    }
    if (datasets[run].tags[tag].conceptualGraph) {
      return tf.graph.SelectionType.CONCEPTUAL_GRAPH;
    }
    return tf.graph.SelectionType.OP_GRAPH;
  }
  _getFile() {
    this.$$('#file').click();
  }
  _setDownloadFilename(name: string) {
    this.$.graphdownload.setAttribute('download', name + '.png');
  }
  _statsNotNull(stats: tf.graph.proto.StepStats) {
    return stats !== null;
  }
  _toggleLegendOpen(): void {
    this.set('_legendOpened', !this._legendOpened);
  }
  _getToggleText(legendOpened: boolean): string {
    return legendOpened ? 'Close legend.' : 'Expand legend.';
  }
  _getToggleLegendIcon(legendOpened: boolean): string {
    // This seems counter-intuitive, but actually makes sense because the
    // expand-more button points downwards, and the expand-less button points
    // upwards. For most collapsibles, this works because the collapsibles
    // expand in the downwards direction. This collapsible expands upwards
    // though, so we reverse the icons.
    return legendOpened ? 'expand-more' : 'expand-less';
  }
  _getSelectionOpGraphDisabled(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number
  ) {
    return (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex].opGraph
    );
  }
  _getSelectionProfileDisabled(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number
  ) {
    return (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex].profile
    );
  }
  _getSelectionConceptualGraphDisabled(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number
  ) {
    return (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex].conceptualGraph
    );
  }
}
