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
import {computed, customElement, observe, property} from '@polymer/decorators';

import '../../../../components_polymer3/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../../components_polymer3/polymer/legacy_element_mixin';
import {Canceller} from '../../../../components_polymer3/tf_backend/canceller';
import {RequestManager} from '../../../../components_polymer3/tf_backend/requestManager';
import {getRouter} from '../../../../components_polymer3/tf_backend/router';
import {addParams} from '../../../../components_polymer3/tf_backend/urlPathHelpers';
import '../../../../components_polymer3/tf_card_heading/tf-card-heading';
import {runsColorScale} from '../../../../components_polymer3/tf_color_scale/colorScale';
import {DataLoaderBehavior} from '../../../../components_polymer3/tf_dashboard_common/data-loader-behavior';
import {VzDistributionChart} from '../vz_distribution_chart/vz-distribution-chart';
import '../vz_distribution_chart/vz-distribution-chart';

export interface TfDistributionLoader extends HTMLElement {
  reload(): void;
}

@customElement('tf-distribution-loader')
class _TfDistributionLoader
  extends DataLoaderBehavior<{run: string; tag: string}, unknown>(
    LegacyElementMixin(PolymerElement)
  )
  implements TfDistributionLoader {
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

  @property({type: Object})
  getDataLoadName = ({run}) => run;

  @property({type: Object})
  getDataLoadUrl = ({tag, run}) => {
    const router = getRouter();
    return addParams(router.pluginRoute('distributions', '/distributions'), {
      tag,
      run,
    });
  };

  @property({type: Object})
  loadDataCallback = (_, datum, backendData) => {
    const data = backendData.map((datum) => {
      // `vz-distribution-chart` wants each datum as an array with
      // extra `wall_time` and `step` properties.
      const [wall_time, step, bins] = datum;
      bins.wall_time = new Date(wall_time * 1000);
      bins.step = step;
      return bins;
    });
    const name = this.getDataLoadName(datum);
    (this.$.chart as VzDistributionChart).setSeriesData(name, data);
    (this.$.chart as VzDistributionChart).setVisibleSeries([name]);
  };

  @property({type: Object})
  _colorScale = {scale: runsColorScale};

  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  _expanded: boolean = false;

  @property({type: Object})
  requestManager: RequestManager;

  @property({type: Object})
  _canceller: Canceller = new Canceller();

  @observe('run', 'tag')
  _reloadOnRunTagChange() {
    this.reload();
  }

  @observe('run', 'tag')
  _updateDataToLoad():void {
    var run = this.run;
    var tag = this.tag;
    this.dataToLoad = [{run, tag}];
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
    (this.$.chart as VzDistributionChart).redraw();
  }

  _toggleExpanded(e) {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }
}
