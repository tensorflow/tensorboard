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
import '../../../components/polymer/irons_and_papers';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {RequestDataCallback} from '../../../components/tf_dashboard_common/data-loader-behavior';
import {getRouter} from '../../../components/tf_backend/router';
import {addParams} from '../../../components/tf_backend/urlPathHelpers';
import '../../../components/tf_card_heading/tf-card-heading';
import {runsColorScale} from '../../../components/tf_color_scale/colorScale';
import '../../../components/tf_dashboard_common/tf-downloader';
import '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import {ScalarDatum} from '../../../components/vz_chart_helpers/vz-chart-helpers';
import '../../../components/vz_line_chart2/vz-line-chart2';
import {DEFAULT_TOOLTIP_COLUMNS} from '../../../components/vz_line_chart2/vz-line-chart2';

type RunTagItem = {run: string; tag: string};

/**
 * Save the initial URL query params, before the AppRoutingEffects initialize.
 */
const initialURLSearchParams = new URLSearchParams(window.location.search);

/**
 * A card that handles loading data (at the right times), rendering a scalar
 * chart, and providing UI affordances (such as buttons) for scalar data.
 */
@customElement('tf-scalar-card')
// tslint:disable-next-line:no-unused-variable
export class TfScalarCard extends PolymerElement {
  static readonly template = html`
    <tf-card-heading
      tag="[[tag]]"
      display-name="[[tagMetadata.displayName]]"
      description="[[tagMetadata.description]]"
    ></tf-card-heading>
    <div id="tf-line-chart-data-loader-container">
      <tf-line-chart-data-loader
        active="[[active]]"
        color-scale="[[_getColorScale(colorScale)]]"
        data-series="[[_getDataSeries(dataToLoad.*)]]"
        data-to-load="[[dataToLoad]]"
        get-data-load-name="[[_getDataLoadName]]"
        get-data-load-url="[[getDataLoadUrl]]"
        request-data="[[requestData]]"
        ignore-y-outliers="[[ignoreYOutliers]]"
        load-data-callback="[[_loadDataCallback]]"
        load-key="[[tag]]"
        log-scale-active="[[_logScaleActive]]"
        request-manager="[[requestManager]]"
        smoothing-enabled="[[smoothingEnabled]]"
        smoothing-weight="[[smoothingWeight]]"
        tag-metadata="[[tagMetadata]]"
        tooltip-columns="[[_tooltipColumns]]"
        tooltip-position="auto"
        tooltip-sorting-method="[[tooltipSortingMethod]]"
        x-type="[[xType]]"
      >
      </tf-line-chart-data-loader>
    </div>
    <div id="buttons">
      <paper-icon-button
        selected$="[[_expanded]]"
        icon="fullscreen"
        on-tap="_toggleExpanded"
      ></paper-icon-button>
      <paper-icon-button
        selected$="[[_logScaleActive]]"
        icon="line-weight"
        on-tap="_toggleLogScale"
        title="Toggle y-axis log scale"
      ></paper-icon-button>
      <paper-icon-button
        icon="settings-overscan"
        on-tap="_resetDomain"
        title="Fit domain to data"
      ></paper-icon-button>
      <template is="dom-if" if="[[showDownloadLinks]]">
        <paper-menu-button on-paper-dropdown-open="_updateDownloadLink">
          <paper-icon-button
            class="dropdown-trigger"
            slot="dropdown-trigger"
            icon="file-download"
          ></paper-icon-button>
          <paper-listbox class="dropdown-content" slot="dropdown-content">
            <paper-item>
              <a id="svgLink" download="[[tag]].svg">
                Download Current Chart as SVG
              </a>
            </paper-item>
          </paper-listbox>
        </paper-menu-button>
      </template>
      <span style="flex-grow: 1"></span>
      <template is="dom-if" if="[[showDownloadLinks]]">
        <div class="download-links">
          <tf-downloader
            runs="[[_runsFromData(dataToLoad)]]"
            tag="[[tag]]"
            url-fn="[[_downloadUrlFn]]"
          ></tf-downloader>
        </div>
      </template>
    </div>
    <style>
      :host {
        margin: 5px;
        display: block;
        width: 330px;
      }

      :host([_expanded]) {
        width: 100%;
      }

      :host([_expanded]) #tf-line-chart-data-loader-container {
        height: 400px;
      }

      #tf-line-chart-data-loader-container {
        height: 200px;
        width: 100%;
      }

      tf-card-heading {
        display: block;
        margin-bottom: 10px;
      }

      #buttons {
        display: flex;
        flex-direction: row;
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

      .download-links {
        display: flex;
        height: 32px;
      }

      .download-links a {
        align-self: center;
        font-size: 10px;
        margin: 2px;
      }

      .download-links paper-dropdown-menu {
        width: 100px;
        --paper-input-container-label: {
          font-size: 10px;
        }
        --paper-input-container-input: {
          font-size: 10px;
        }
      }

      paper-menu-button {
        padding: 0;
      }
      paper-item a {
        color: inherit;
        text-decoration: none;
        white-space: nowrap;
      }
    </style>
  `;

  @property({type: String})
  tag: string;

  @property({type: Array})
  dataToLoad: object[];

  @property({type: String})
  xType: string;

  @property({type: Boolean})
  active: boolean;

  @property({type: Boolean})
  ignoreYOutliers: boolean;

  @property({type: Object})
  requestManager: RequestManager;

  @property({type: Boolean})
  showDownLinks: boolean;

  @property({type: Boolean})
  smoothingEnabled: boolean;

  @property({type: Number})
  smoothingWeight: number;

  @property({type: Object})
  tagMetadata: object;

  // If specified uses the given colorScale; otherwise, uses a built-in
  // default. See _getColorScale below for more details.
  @property({type: Object})
  colorScale: object = null;

  @property({type: String})
  tooltipSortingMethod: string;

  // This function is called when data is received from the backend.
  @property({type: Object})
  _loadDataCallback: object = (scalarChart, item, maybeData) => {
    if (maybeData == null) {
      console.error('Failed to load data for:', item);
      return;
    }
    const formattedData = maybeData.map((datum) => ({
      wall_time: new Date(datum[0] * 1000),
      step: datum[1],
      scalar: datum[2],
    }));
    const name = this._getSeriesNameFromDatum(item);
    scalarChart.setSeriesMetadata(name, item);
    scalarChart.setSeriesData(name, formattedData);
  };

  @property({type: Object})
  getDataLoadUrl: Function = ({tag, run}) => {
    return getRouter().pluginRoute(
      'scalars',
      '/scalars',
      new URLSearchParams({tag, run})
    );
  };

  // To be provided as the `url-fn` property to `tf-downloader`.
  @property({type: Object})
  _downloadUrlFn: object = (tag, run) => this.getDataLoadUrl({tag, run});

  // A function called to fetch the scalars data from the backend.
  // Should receive a {tag, run, experiment} object and return
  // a promise resolving with the fetched scalars. The default
  // implementation of this function executes:
  // this.requestManager.request(
  //      this.getDataLoadUrl({tag, run, experiment})
  @property({type: Object})
  requestData: RequestDataCallback<RunTagItem, ScalarDatum[] | null> = (
    items,
    onLoad,
    onFinish
  ) => {
    // Google-internal Colab doesn't support HTTP POST requests, so we fall
    // back to HTTP GET (even though public Colab supports POST).
    // See b/126387106.
    const inColab = initialURLSearchParams.get('tensorboardColab') === 'true';
    if (inColab) {
      return this._requestDataGet(items, onLoad, onFinish);
    } else {
      return this._requestDataPost(items, onLoad, onFinish);
    }
  };

  _requestDataGet: RequestDataCallback<RunTagItem, ScalarDatum[] | null> = (
    items,
    onLoad,
    onFinish
  ) => {
    const router = getRouter();
    const baseUrl = router.pluginRoute('scalars', '/scalars');
    Promise.all(
      items.map((item) => {
        const url = addParams(baseUrl, {tag: item.tag, run: item.run});
        return this.requestManager
          .request(url)
          .then((data) => void onLoad({item, data}));
      })
    ).finally(() => void onFinish());
  };

  _requestDataPost: RequestDataCallback<RunTagItem, ScalarDatum[] | null> = (
    items,
    onLoad,
    onFinish
  ) => {
    const router = getRouter();
    const url = router.pluginRoute('scalars', '/scalars_multirun');
    const runsByTag = new Map<string, string[]>();
    for (const {tag, run} of items) {
      let runs = runsByTag.get(tag);
      if (runs == null) {
        runsByTag.set(tag, (runs = []));
      }
      runs.push(run);
    }

    // Request at most this many runs at once.
    //
    // Back-of-the-envelope math: each scalar datum JSON value contains
    // two floats and a small-ish integer. Floats are about 18 bytes,
    // since f64s have -log_10(2^-53) ~= 16 digits of precision plus
    // decimal point and leading zero. Small-ish integers (steps) are
    // about 5 bytes. Add JSON overhead `[,,],` and you're looking at
    // about 48 bytes per datum. With standard downsampling of
    // 1000 points per time series, expect ~50 KB of response payload
    // per requested time series.
    //
    // Requesting 64 time series warrants a ~3 MB response, which seems
    // reasonable.
    const BATCH_SIZE = 64;

    const requestGroups = [];
    for (const [tag, runs] of runsByTag) {
      for (let i = 0; i < runs.length; i += BATCH_SIZE) {
        requestGroups.push({tag, runs: runs.slice(i, i + BATCH_SIZE)});
      }
    }

    Promise.all(
      requestGroups.map(({tag, runs}) => {
        return this.requestManager.request(url, {tag, runs}).then((allData) => {
          for (const run of runs) {
            const item = {tag, run};
            if (Object.prototype.hasOwnProperty.call(allData, run)) {
              onLoad({item, data: allData[run]});
            } else {
              onLoad({item, data: null});
            }
          }
        });
      })
    ).finally(() => void onFinish());
  };

  @property({type: Object})
  _getDataLoadName: object = (datum) => this._getSeriesNameFromDatum(datum);

  @property({
    type: Boolean,
    reflectToAttribute: true, // for CSS
  })
  _expanded: boolean = false;

  @property({type: Boolean})
  _logScaleActive: boolean;

  @property({type: Array})
  _tooltipColumns: unknown[] = (() => {
    const columns = DEFAULT_TOOLTIP_COLUMNS.slice();
    const ind = columns.findIndex((c) => c.title == 'Name');
    columns.splice(ind, 1, {
      title: 'Name',
      evaluate: (d) => {
        const datum = d.dataset.metadata().meta;
        return this._getSeriesDisplayNameFromDatum(datum);
      },
    });
    return columns;
  })();

  _getChartDataLoader() {
    // tslint:disable-next-line:no-unnecessary-type-assertion
    return this.shadowRoot.querySelector('tf-line-chart-data-loader') as any; // TfLineChartDataLoader
  }

  reload() {
    this._getChartDataLoader().reload();
  }

  redraw() {
    this._getChartDataLoader().redraw();
  }

  _toggleExpanded(e) {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }

  _toggleLogScale() {
    this.set('_logScaleActive', !this._logScaleActive);
  }

  _resetDomain() {
    const chart = this._getChartDataLoader();
    if (chart) {
      chart.resetDomain();
    }
  }

  _updateDownloadLink() {
    const svgStr = this._getChartDataLoader().exportAsSvgString();
    // The SVG code string may include hash characters, such as an
    // attribute `clipPath="url(#foo)"`. Thus, we base64-encode the
    // data so that such a hash is not interpreted as a fragment
    // specifier, truncating the SVG. (See issue #1874.)
    // tslint:disable-next-line:no-unnecessary-type-assertion
    const svgLink = this.shadowRoot.querySelector(
      '#svgLink'
    ) as HTMLAnchorElement;
    (svgLink as any).href = `data:image/svg+xml;base64,${btoa(svgStr)}`;
  }

  _runsFromData(data) {
    return data.map((datum) => datum.run);
  }

  _getDataSeries() {
    return this.dataToLoad.map((d) => this._getSeriesNameFromDatum(d as any));
  }

  // name is a stable identifier for a series.
  _getSeriesNameFromDatum({run, experiment = {name: '_default'}}) {
    return JSON.stringify([experiment.name, run]);
  }

  // title is a visible string of a series for the UI.
  _getSeriesDisplayNameFromDatum(datum) {
    return datum.run;
  }

  _getColorScale() {
    if (this.colorScale !== null) {
      return this.colorScale;
    }
    // If 'colorScale' isn't explicitly specified, use the ones
    // defined in tf_color_scale.
    return {
      scale: (name) => {
        const [, run] = JSON.parse(name);
        return runsColorScale(run);
      },
    };
  }
}
