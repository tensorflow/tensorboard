/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
import {LegacyElementMixin} from '@polymer/polymer/lib/legacy/legacy-element-mixin';
import {customElement, property} from '@polymer/decorators';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu';
import '@polymer/paper-icon-button';
import '@polymer/paper-item';
import '@polymer/paper-listbox';
import '@polymer/paper-menu-button';

import '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import {TfLineChartDataLoader} from '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import '../../../components/tf_card_heading/tf-card-heading';
import '../../../components/tf_dashboard_common/tf-downloader';
import {getRouter} from '../../../components/tf_backend';
import {
  runsColorScale,
  ColorScale,
} from '../../../components/tf_color_scale/colorScale';
import {
  XType,
  ScalarDatum,
} from '../../../components/vz_chart_helpers/vz-chart-helpers';
import {TooltipSortingMethod} from '../../../components/vz_line_chart2/line-chart';
import {
  VzLineChart2,
  DEFAULT_TOOLTIP_COLUMNS,
} from '../../../components/vz_line_chart2/vz-line-chart2';
import {TagInfo} from '../../../components/tf_utils/utils';

export interface ScalarEntry {
  run: string;
  tag: string;
}

export interface TagMetadata {
  displayName: string;
  description?: string;
}

@customElement('tf-scalar-card')
export class TfScalarCard extends LegacyElementMixin(PolymerElement) {
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
        ignore-y-outliers="[[ignoreYOutliers]]"
        load-data-callback="[[_loadDataCallback]]"
        load-key="[[tag]]"
        log-scale-active="[[_logScaleActive]]"
        request-manager="[[requestManager]]"
        smoothing-enabled="[[smoothingEnabled]]"
        smoothing-weight="[[smoothingWeight]]"
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
  tag!: string;

  @property({type: Array})
  dataToLoad!: ScalarEntry[];

  @property({type: String})
  xType?: XType;

  @property({type: Boolean})
  active!: boolean;

  @property({type: Boolean})
  ignoreYOutliers?: boolean;

  @property({type: Object})
  requestManager!: object;

  @property({type: Boolean})
  showDownloadLinks: boolean = false;

  @property({type: Boolean})
  smoothingEnabled: boolean = false;

  @property({type: Number})
  smoothingWeight?: number;

  @property({type: Object})
  tagMetadata!: TagInfo;

  @property({
    type: Object,
  })
  colorScale: ColorScale | null = null;

  @property({type: String})
  tooltipSortingMethod?: TooltipSortingMethod;

  @property({
    type: Object,
  })
  private _loadDataCallback = (
    scalarChart: VzLineChart2<ScalarEntry>,
    datum: ScalarEntry,
    data: Array<[number, number, number]>
  ) => {
    const formattedData: ScalarDatum[] = data.map((datum) => ({
      wall_time: new Date(datum[0] * 1000),
      step: datum[1],
      scalar: datum[2],
    }));
    const name = this._getSeriesNameFromDatum(datum);
    scalarChart.setSeriesMetadata(name, datum);
    scalarChart.setSeriesData(name, formattedData);
  };

  @property({type: Object})
  getDataLoadUrl = ({tag, run}: ScalarEntry) => {
    return getRouter().pluginRoute(
      'scalars',
      '/scalars',
      new URLSearchParams({tag, run})
    );
  };

  @property({type: Object})
  _downloadUrlFn = (tag: string, run: string) =>
    this.getDataLoadUrl({tag, run});

  @property({type: Object})
  _getDataLoadName = (datum: ScalarEntry) =>
    this._getSeriesNameFromDatum(datum);

  @property({
    type: Boolean,
    reflectToAttribute: true, // for CSS
  })
  _expanded: boolean = false;

  @property({type: Boolean})
  _logScaleActive: boolean = false;

  @property({
    type: Array,
  })
  _tooltipColumns = this.getDefaultTooltipColumns();

  private getDefaultTooltipColumns() {
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
  }

  private getChart(): TfLineChartDataLoader<ScalarEntry> | null {
    const el = this.$$('tf-line-chart-data-loader');
    if (el === null) return null;
    return (el as unknown) as TfLineChartDataLoader<ScalarEntry>;
  }

  reload() {
    const chart = this.getChart();
    if (chart) chart.reload();
  }

  redraw() {
    const chart = this.getChart();
    if (chart) chart.redraw();
  }
  _toggleExpanded() {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }
  _toggleLogScale() {
    this.set('_logScaleActive', !this._logScaleActive);
  }
  _resetDomain() {
    const chart = this.getChart();
    if (chart) {
      chart.resetDomain();
    }
  }
  _updateDownloadLink() {
    const chart = this.getChart();
    if (!chart) return;
    const svgStr = chart.exportAsSvgString();
    // The SVG code string may include hash characters, such as an
    // attribute `clipPath="url(#foo)"`. Thus, we base64-encode the
    // data so that such a hash is not interpreted as a fragment
    // specifier, truncating the SVG. (See issue #1874.)
    const anchorElement = this.$$('#svgLink') as HTMLAnchorElement;
    anchorElement.href = `data:image/svg+xml;base64,${btoa(svgStr)}`;
  }

  _runsFromData(data: ScalarEntry[]) {
    return data.map((datum) => datum.run);
  }

  _getDataSeries() {
    return this.dataToLoad.map((d) => this._getSeriesNameFromDatum(d));
  }
  // name is a stable identifier for a series.
  _getSeriesNameFromDatum(datum: ScalarEntry) {
    return JSON.stringify(['_default', datum.run]);
  }
  // title is a visible string of a series for the UI.
  _getSeriesDisplayNameFromDatum(datum: ScalarEntry) {
    return datum.run;
  }
  _getColorScale() {
    if (this.colorScale !== null) {
      return this.colorScale;
    }
    // If 'colorScale' isn't explicitly specified, use the ones
    // defined in
    return {
      scale: (name: string) => {
        const [, run] = JSON.parse(name) as [string, string];
        return runsColorScale(run);
      },
    };
  }
}
