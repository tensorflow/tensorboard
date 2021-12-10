/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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

import {computed, customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import {addParams} from '../../../components/tf_backend/urlPathHelpers';
import '../../../components/tf_card_heading/tf-card-heading';
import {runsColorScale} from '../../../components/tf_color_scale/colorScale';
import {
  DataLoaderBehavior,
  RequestDataCallback,
} from '../../../components/tf_dashboard_common/data-loader-behavior';
import '../vz_histogram_timeseries/vz-histogram-timeseries';
import {VzHistogramTimeseries} from '../vz_histogram_timeseries/vz-histogram-timeseries';
import './histogramCore';
import {backendToVz, VzHistogram} from './histogramCore';

// Response from /data/plugin/histograms/tags.
export interface HistogramTagInfo {
  displayName: string;
  description: string;
}

export interface TfHistogramLoader extends HTMLElement {
  reload(): void;
}

type RunTagItem = {run: string; tag: string};

@customElement('tf-histogram-loader')
class _TfHistogramLoader
  extends DataLoaderBehavior<RunTagItem, VzHistogram[]>(
    LegacyElementMixin(PolymerElement)
  )
  implements TfHistogramLoader
{
  static readonly template = html`
    <tf-card-heading
      tag="[[tag]]"
      run="[[run]]"
      display-name="[[tagMetadata.displayName]]"
      description="[[tagMetadata.description]]"
      color="[[_runColor]]"
    ></tf-card-heading>
    <!--
      The main histogram that we render. Data is set directly with
      \`setSeriesData\`, not with a bound property.
    -->
    <vz-histogram-timeseries
      id="chart"
      time-property="[[timeProperty]]"
      mode="[[histogramMode]]"
      color-scale="[[_colorScaleFunction]]"
    ></vz-histogram-timeseries>
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
        will-change: transform;
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
        width: 90%;
      }
    </style>
  `;

  @property({type: String})
  run: string;

  @property({type: String})
  tag: string;

  @property({type: Object})
  getDataLoadName = ({run}: {run: string; tag: string}): string => run;

  @property({type: Object})
  requestManager: RequestManager;

  requestData: RequestDataCallback<RunTagItem, VzHistogram[]> = (
    items,
    onLoad,
    onFinish
  ) => {
    const router = getRouter();
    const baseUrl = router.pluginRoute('histograms', '/histograms');
    Promise.all(
      items.map((item) => {
        const url = addParams(baseUrl, {tag: item.tag, run: item.run});
        return this.requestManager
          .request(url)
          .then((data) => void onLoad({item, data}));
      })
    ).finally(() => void onFinish());
  };

  @property({type: Object})
  loadDataCallback = (_, datum, data) => {
    const d3Data = backendToVz(data);
    const name = this.getDataLoadName(datum);
    (this.$.chart as VzHistogramTimeseries).setSeriesData(name, d3Data);
  };

  @property({type: Object})
  tagMetadata: HistogramTagInfo;

  @property({type: String})
  timeProperty: string;

  @property({type: String})
  histogramMode: string;

  @property({type: Object})
  _colorScaleFunction: (runName: string) => string = runsColorScale;

  @property({type: Boolean, reflectToAttribute: true})
  _expanded: boolean = false;

  @observe('run', 'tag', 'requestManager')
  _reloadOnRunTagRequestManagerChange() {
    this.reload();
  }

  @observe('run', 'tag')
  _updateDataToLoad() {
    var run = this.run;
    var tag = this.tag;
    this.dataToLoad = [{run, tag}];
  }

  @computed('run')
  get _runColor(): string {
    var run = this.run;
    return this._colorScaleFunction(run);
  }

  redraw() {
    (this.$.chart as VzHistogramTimeseries).redraw();
  }

  _toggleExpanded(e) {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }
}
