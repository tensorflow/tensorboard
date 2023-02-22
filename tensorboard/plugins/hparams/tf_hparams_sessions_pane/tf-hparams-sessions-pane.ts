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

import {customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import '../../../components/polymer/irons_and_papers';
import '../tf_hparams_parallel_coords_view/tf-hparams-parallel-coords-view';
import '../tf_hparams_scatter_plot_matrix_view/tf-hparams-scatter-plot-matrix-view';
import '../tf_hparams_table_view/tf-hparams-table-view';

/**
 * The tf-hparams-session-pane element implements a tabbed view of the
 * session groups. Each tab is implemented by its own element and shows
 * a specific view of the session groups list. Example of views are a table-view
 * and parallel-coordinates (https://en.wikipedia.org/wiki/Parallel_coordinates)
 * view.
 */
@customElement('tf-hparams-sessions-pane')
class TfHparamsSessionsPane extends PolymerElement {
  constructor() {
    super();
    // If window['ga'] is defined, use it, otherwise any logging calls will be
    // no-ops.
    // @ts-ignore
    this.ga = window['ga'] || function () {};
  }
  static readonly template = html`
    <paper-header-panel>
      <paper-toolbar slot="header" class="tab-bar">
        <paper-tabs selected="{{_selectedTab}}" slot="top">
          <!-- view-id can be used by integration tests to locate a tab.
               It should be the name of the root element implementing the view
               without the 'tf-hparams-' prefix. -->
          <paper-tab on-click="_tableTabClicked" view-id="table-view">
            TABLE VIEW
          </paper-tab>
          <paper-tab
            on-click="_parrellelCoordsTabClicked"
            view-id="parallel-coords-view"
          >
            PARALLEL COORDINATES VIEW
          </paper-tab>
          <paper-tab
            on-click="_scatterPlotMatrixTabClicked"
            view-id="scatter-plot-matrix-view"
          >
            SCATTER PLOT MATRIX VIEW
          </paper-tab>
          <div class="help-and-feedback">
            <template is="dom-if" if="[[bugReportUrl]]">
              <a
                href$="[[bugReportUrl]]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <paper-button
                  id="bug-report"
                  raised
                  title="Send a bug report or feature request"
                >
                  Bug Report / Feature Request
                </paper-button>
              </a>
            </template>
            <template is="dom-if" if="[[helpUrl]]">
              <a href$="[[helpUrl]]" target="_blank" rel="noopener noreferrer">
                <paper-icon-button
                  icon="help-outline"
                  title="View documentation"
                >
                </paper-icon-button>
              </a>
            </template>
          </div>
        </paper-tabs>
      </paper-toolbar>
      <iron-pages selected="[[_selectedTab]]" class="fit tab-view">
        <div id="0" class="tab">
          <tf-hparams-table-view
            backend="[[backend]]"
            experiment-name="[[experimentName]]"
            visible-schema="[[configuration.visibleSchema]]"
            session-groups="[[sessionGroups]]"
            enable-show-metrics
          >
          </tf-hparams-table-view>
        </div>
        <div id="1" class="tab">
          <tf-hparams-parallel-coords-view
            backend="[[backend]]"
            experiment-name="[[experimentName]]"
            configuration="[[configuration]]"
            session-groups="[[sessionGroups]]"
          >
          </tf-hparams-parallel-coords-view>
        </div>
        <div id="2" class="tab">
          <tf-hparams-scatter-plot-matrix-view
            backend="[[backend]]"
            experiment-name="[[experimentName]]"
            configuration="[[configuration]]"
            session-groups="[[sessionGroups]]"
          >
          </tf-hparams-scatter-plot-matrix-view>
        </div>
      </iron-pages>
    </paper-header-panel>

    <style>
      .tab-view {
        height: 100%;
      }
      .tab-bar {
        overflow-y: auto;
        color: white;
        background-color: var(
          --tb-toolbar-background-color,
          var(--tb-orange-strong)
        );
      }
      .tab {
        height: 100%;
      }
      paper-tabs {
        flex-grow: 1;
        width: 100%;
        height: 100%;
        --paper-tabs-selection-bar-color: white;
        --paper-tabs-content: {
          -webkit-font-smoothing: antialiased;
        }
      }
      tf-hparams-table-view {
        width: 100%;
        height: 100%;
      }
      .help-and-feedback {
        display: inline-flex; /* Ensure that icons stay aligned */
        justify-content: flex-end;
        align-items: center;
        text-align: right;
        color: white;
      }
      #bug-report {
        border: solid black;
        background: red;
        white-space: normal;
        word-break: break-words;
        font-size: 12px;
        max-width: 150px;
        text-align: left;
      }
      .help-and-feedback a {
        color: white;
        text-decoration: none;
      }
    </style>
  `;
  @property({type: Object})
  backend: object;
  @property({type: String})
  helpUrl: string;
  @property({type: String})
  bugReportUrl: string;
  @property({type: String})
  experimentName: string;
  @property({type: Object})
  configuration: object;
  @property({type: Array})
  sessionGroups: unknown[];
  @property({
    type: Number,
  })
  _selectedTab: number = 0;
  _tableTabClicked: () => void = () => {
    this.logTabClick('Table');
  };
  _parrellelCoordsTabClicked: () => void = () => {
    this.logTabClick('Parrellel Coords');
  };
  _scatterPlotMatrixTabClicked: () => void = () => {
    this.logTabClick('Scatter Plot Matrix');
  };

  logTabClick: (tabName: string) => void = (tabName: string) => {
    // @ts-ignore
    this.ga('send', {
      hitType: 'event',
      eventCategory: 'HParam',
      eventAction: 'Tab Clicked',
      eventLabel: tabName,
    });
  };
}
