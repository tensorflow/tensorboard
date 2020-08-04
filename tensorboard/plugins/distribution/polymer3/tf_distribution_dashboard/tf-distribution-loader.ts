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
import '@polymer/paper-icon-button';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/data-loader-behavior.html';
import {DO_NOT_SUBMIT} from '../vz-distribution-chart/vz-distribution-chart.html';
import '@polymer/paper-icon-button';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/data-loader-behavior.html';
import {DO_NOT_SUBMIT} from '../vz-distribution-chart/vz-distribution-chart.html';
@customElement('tf-distribution-loader')
class TfDistributionLoader extends PolymerElement {
  static readonly template = html`
    <tf-card-heading
      tag="[[tag]]"
      run="[[run]]"
      display-name="[[tagMetadata.displayName]]"
      description="[[tagMetadata.description]]"
      color="[[_runColor]]"
    ></tf-card-heading>
    <!--
      The main distribution that we render. Data is set directly with
      \`setSeriesData\`, not with a bound property.
    -->
    <vz-distribution-chart
      id="chart"
      x-type="[[xType]]"
      color-scale="[[_colorScale]]"
    ></vz-distribution-chart>
    <div style="display: flex; flex-direction: row;">
      <paper-icon-button
        selected$="[[_expanded]]"
        icon="fullscreen"
        on-tap="_toggleExpanded"
      ></paper-icon-button>
    </div>
    <style>
      :host {
        display: flex;
        flex-direction: column;
        width: 330px;
        height: 235px;
        margin-right: 10px;
        margin-bottom: 15px;
      }
      :host([_expanded]) {
        width: 700px;
        height: 500px;
      }

      vz-histogram-timeseries {
        -moz-user-select: none;
        -webkit-user-select: none;
      }

      paper-icon-button {
        color: #2196f3;
        border-radius: 100%;
        width: 32px;
        height: 32px;
        padding: 4px;
      }
      paper-icon-button[selected] {
        background: var(--tb-ui-light-accent);
      }

      tf-card-heading {
        margin-bottom: 10px;
      }
    </style>
  `;
  @property({type: String})
  run: string;
  @property({type: String})
  tag: string;
  @property({type: Object})
  tagMetadata: object;
  @property({type: String})
  xType: string;
  @property({
    type: Function,
  })
  getDataLoadName: object = () => ({run}) => run;
  @property({
    type: Function,
  })
  getDataLoadUrl: object = () => ({tag, run}) => {
    const router = tf_backend.getRouter();
    return tf_backend.addParams(
      router.pluginRoute('distributions', '/distributions'),
      {tag, run}
    );
  };
  @property({
    type: Function,
  })
  loadDataCallback: object = function() {
    return (_, datum, backendData) => {
      const data = backendData.map((datum) => {
        // `vz-distribution-chart` wants each datum as an array with
        // extra `wall_time` and `step` properties.
        const [wall_time, step, bins] = datum;
        bins.wall_time = new Date(wall_time * 1000);
        bins.step = step;
        return bins;
      });
      const name = this.getDataLoadName(datum);
      this.$.chart.setSeriesData(name, data);
      this.$.chart.setVisibleSeries([name]);
    };
  };
  @property({
    type: Object,
    readOnly: true,
  })
  _colorScale: object = () => ({scale: tf_color_scale.runsColorScale});
  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  _expanded: boolean = false;
  @property({type: Object})
  requestManager: object;
  @property({
    type: Object,
  })
  _canceller: object = () => new tf_backend.Canceller();
  @observe('run', 'tag')
  reload() {}
  behaviors: [tf_dashboard_common.DataLoaderBehavior];
  @computed('run', 'tag')
  get dataToLoad(): unknown[] {
    var run = this.run;
    var tag = this.tag;
    return [{run, tag}];
  }
  @computed('run')
  get _runColor(): string {
    var run = this.run;
    return this._colorScale.scale(run);
  }
  /**
   * Ask the distribution chart to redraw itself. This should be
   * called whenever the dimensions of the view change (e.g., when
   * the card is expanded), as the distribution chart will need to
   * recalculate its layout.
   */
  redraw() {
    this.$.chart.redraw();
  }
  _toggleExpanded(e) {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }
}
