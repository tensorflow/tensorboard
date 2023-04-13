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

import {computed, customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import {DomRepeat} from '../../../components/polymer/dom-repeat';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import '../../../components/tf_backend/tf-backend';
import {addParams} from '../../../components/tf_backend/urlPathHelpers';
import '../../../components/tf_card_heading/tf-card-heading';
import {runsColorScale} from '../../../components/tf_color_scale/colorScale';
import {RequestDataCallback} from '../../../components/tf_dashboard_common/data-loader-behavior';
import '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import {TfLineChartDataLoader} from '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import {
  ScalarDatum,
  SYMBOLS_LIST,
} from '../../../components/vz_chart_helpers/vz-chart-helpers';
import './tf-custom-scalar-card-style';
import {
  DataSeries,
  DataSeriesColorScale,
  generateDataSeriesName,
} from './tf-custom-scalar-helpers';

export interface TfCustomScalarMultiLineChartCard extends HTMLElement {
  reload(): void;
}

type RunItem = string;
type CustomScalarsDatum = {
  regex_valid: boolean;
  tag_to_events: Record<string, ScalarDatum[]>;
};

@customElement('tf-custom-scalar-multi-line-chart-card')
class _TfCustomScalarMultiLineChartCard
  extends LegacyElementMixin(PolymerElement)
  implements TfCustomScalarMultiLineChartCard
{
  static readonly template = html`
    <tf-card-heading display-name="[[_titleDisplayString]]"></tf-card-heading>
    <div id="tf-line-chart-data-loader-container">
      <tf-line-chart-data-loader
        id="loader"
        active="[[active]]"
        color-scale="[[_colorScale]]"
        data-series="[[_seriesNames]]"
        ignore-y-outliers="[[ignoreYOutliers]]"
        load-key="[[_tagFilter]]"
        data-to-load="[[runs]]"
        request-data="[[_requestData]]"
        log-scale-active="[[_logScaleActive]]"
        load-data-callback="[[_createProcessDataFunction()]]"
        request-manager="[[requestManager]]"
        smoothing-enabled="[[smoothingEnabled]]"
        smoothing-weight="[[smoothingWeight]]"
        symbol-function="[[_createSymbolFunction()]]"
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
      <span style="flex-grow: 1"></span>
      <template is="dom-if" if="[[showDownloadLinks]]">
        <div class="download-links">
          <paper-dropdown-menu
            no-label-float="true"
            label="series to download"
            selected-item-label="{{_dataSeriesNameToDownload}}"
          >
            <paper-listbox class="dropdown-content" slot="dropdown-content">
              <template
                is="dom-repeat"
                items="[[_seriesNames]]"
                as="dataSeriesName"
              >
                <paper-item no-label-float="true"
                  >[[dataSeriesName]]</paper-item
                >
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
          <a
            download="[[_dataSeriesNameToDownload]].csv"
            href="[[_csvUrl(_nameToDataSeries, _dataSeriesNameToDownload)]]"
            >CSV</a
          >
          <a
            download="[[_dataSeriesNameToDownload]].json"
            href="[[_jsonUrl(_nameToDataSeries, _dataSeriesNameToDownload)]]"
            >JSON</a
          >
        </div>
      </template>
    </div>
    <div id="matches-container">
      <div id="matches-list-title">
        <template is="dom-if" if="[[_seriesNames.length]]">
          <paper-icon-button
            icon="[[_getToggleMatchesIcon(_matchesListOpened)]]"
            on-click="_toggleMatchesOpen"
            class="toggle-matches-button"
          >
          </paper-icon-button>
        </template>

        <span class="matches-text"> Matches ([[_seriesNames.length]]) </span>
      </div>
      <template is="dom-if" if="[[_seriesNames.length]]">
        <iron-collapse opened="[[_matchesListOpened]]">
          <div id="matches-list">
            <template
              is="dom-repeat"
              items="[[_seriesNames]]"
              as="seriesName"
              id="match-list-repeat"
              on-dom-change="_matchListEntryColorUpdated"
            >
              <div class="match-list-entry">
                <span class="match-entry-symbol">
                  [[_determineSymbol(_nameToDataSeries, seriesName)]]
                </span>
                [[seriesName]]
              </div>
            </template>
          </div>
        </iron-collapse>
      </template>
    </div>

    <style include="tf-custom-scalar-card-style"></style>
    <style>
      #matches-list-title {
        margin: 10px 0 5px 0;
      }

      #matches-list {
        max-height: 200px;
        overflow-y: auto;
      }

      .match-list-entry {
        margin: 0 0 5px 0;
      }

      .match-entry-symbol {
        font-family: arial, sans-serif;
        display: inline-block;
        width: 10px;
      }

      .matches-text {
        vertical-align: middle;
      }
    </style>
  `;

  @property({type: Array})
  runs: string[];

  @property({type: String})
  xType: string;

  @property({type: Boolean})
  active: boolean = true;

  @property({type: String})
  override title: string;

  @property({type: Array})
  tagRegexes: string[];

  @property({type: Boolean})
  ignoreYOutliers: boolean;

  @property({type: Object})
  requestManager: RequestManager;

  @property({type: Boolean})
  showDownloadLinks: boolean;

  @property({type: Boolean})
  smoothingEnabled: boolean;

  @property({type: Number})
  smoothingWeight: number;

  @property({type: Object})
  tagMetadata: object;

  @property({type: String})
  tooltipSortingMethod: string;

  @property({type: Object})
  _colorScale: DataSeriesColorScale = new DataSeriesColorScale({
    scale: runsColorScale,
  } as any);

  @property({type: Object})
  _nameToDataSeries: object = {};

  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  _expanded: boolean = false;

  @property({type: Boolean})
  _logScaleActive: boolean;

  @property({type: Object})
  _requestData: RequestDataCallback<RunItem, CustomScalarsDatum> = (
    items,
    onLoad,
    onFinish
  ) => {
    const router = getRouter();
    const baseUrl = router.pluginRoute('custom_scalars', '/scalars');
    Promise.all(
      items.map((item) => {
        const run = item;
        const tag = this._tagFilter;
        const url = addParams(baseUrl, {tag, run});
        return this.requestManager
          .request(url)
          .then((data) => void onLoad({item, data}));
      })
    ).finally(() => void onFinish());
  };

  @property({type: Object})
  _runToNextAvailableSymbolIndex: object = {};

  @property({type: Boolean})
  _matchesListOpened: boolean = false;

  reload() {
    (this.$.loader as TfLineChartDataLoader).reload();
  }

  redraw() {
    (this.$.loader as TfLineChartDataLoader).redraw();
  }

  _toggleExpanded(e) {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }

  _toggleLogScale() {
    this.set('_logScaleActive', !this._logScaleActive);
  }

  _resetDomain() {
    const chart = this.$.loader as TfLineChartDataLoader;
    if (chart) {
      chart.resetDomain();
    }
  }

  _csvUrl(nameToSeries, dataSeriesName) {
    if (!dataSeriesName) return '';
    const baseUrl = this._downloadDataUrl(nameToSeries, dataSeriesName);
    return addParams(baseUrl, {format: 'csv'});
  }

  _jsonUrl(nameToSeries, dataSeriesName) {
    if (!dataSeriesName) return '';
    const baseUrl = this._downloadDataUrl(nameToSeries, dataSeriesName);
    return addParams(baseUrl, {format: 'json'});
  }

  _downloadDataUrl(nameToSeries, dataSeriesName) {
    const dataSeries = nameToSeries[dataSeriesName];
    const getVars = new URLSearchParams({
      tag: dataSeries.getTag(),
      run: dataSeries.getRun(),
    });
    return getRouter().pluginRouteForSrc(
      'custom_scalars',
      '/download_data',
      getVars
    );
  }

  _createProcessDataFunction() {
    // This function is called when data is received from the backend.
    return (scalarChart, run, data) => {
      if (data.regex_valid) {
        // The user's regular expression was valid.
        // Incorporate these newly loaded values.
        const newMapping = _.clone(this._nameToDataSeries);
        _.forOwn(data.tag_to_events, (scalarEvents, tag) => {
          const data = scalarEvents.map((datum) => ({
            wall_time: new Date(datum[0] * 1000),
            step: datum[1],
            scalar: datum[2],
          }));
          const seriesName = generateDataSeriesName(run, tag);
          const datum = newMapping[seriesName];
          if (datum) {
            // This series already exists.
            datum.setData(data);
          } else {
            if (_.isUndefined(this._runToNextAvailableSymbolIndex[run])) {
              // The run has not been seen before. Define the next available
              // marker index.
              this._runToNextAvailableSymbolIndex[run] = 0;
            }
            // Every data series within a run has a unique symbol.
            const lineChartSymbol =
              SYMBOLS_LIST[this._runToNextAvailableSymbolIndex[run]];
            // Create a series with this name.
            const series = new DataSeries(
              run,
              tag,
              seriesName,
              data,
              lineChartSymbol
            );
            newMapping[seriesName] = series;
            // Loop back to the beginning if we are out of symbols.
            const numSymbols = SYMBOLS_LIST.length;
            this._runToNextAvailableSymbolIndex[run] =
              (this._runToNextAvailableSymbolIndex[run] + 1) % numSymbols;
          }
        });
        this.set('_nameToDataSeries', newMapping);
      } else {
        // The user's regular expression was invalid.
        // TODO(chihuahua): Handle this.
      }
    };
  }

  @observe('_nameToDataSeries')
  _updateChart() {
    var _nameToDataSeries = this._nameToDataSeries;
    // Add new data series.
    Object.entries(_nameToDataSeries).forEach(([name, series]) => {
      (this.$.loader as TfLineChartDataLoader).setSeriesData(
        name,
        series.getData()
      );
    });
    (this.$.loader as TfLineChartDataLoader).commitChanges();
  }

  _computeSelectedRunsSet(runs) {
    const mapping = {};
    _.forEach(runs, (run) => {
      mapping[run] = 1;
    });
    return mapping;
  }

  @computed('_nameToDataSeries', 'runs')
  get _seriesNames(): object {
    const runLookup = new Set(this.runs);
    return Object.entries(this._nameToDataSeries)
      .filter(([_, series]) => runLookup.has(series.run))
      .map(([name]) => name);
  }

  _determineColor(colorScale, seriesName) {
    return colorScale.scale(seriesName);
  }

  @observe('_tagFilter')
  _refreshDataSeries() {
    var _tagFilter = this._tagFilter;
    this.set('_nameToDataSeries', {});
  }

  _createSymbolFunction() {
    return (seriesName) =>
      this._nameToDataSeries[seriesName].getSymbol().method();
  }

  _determineSymbol(nameToSeries, seriesName) {
    return nameToSeries[seriesName].getSymbol().character;
  }

  @computed('tagRegexes')
  get _tagFilter(): string {
    var tagRegexes = this.tagRegexes;
    if (tagRegexes.length === 1) {
      return tagRegexes[0];
    }
    // Combine the different regexes into a single regex.
    return tagRegexes.map((r) => '(' + r + ')').join('|');
  }

  _getToggleMatchesIcon(matchesListOpened) {
    return matchesListOpened ? 'expand-less' : 'expand-more';
  }

  _toggleMatchesOpen() {
    this.set('_matchesListOpened', !this._matchesListOpened);
  }

  @computed('title')
  get _titleDisplayString(): string {
    var title = this.title;
    // If no title is provided, use a placeholder string.
    return title || 'untitled';
  }

  _matchListEntryColorUpdated(event) {
    const domRepeat = this.$$('#match-list-repeat') as DomRepeat | null;
    if (!domRepeat) {
      return;
    }
    this.root
      ?.querySelectorAll('.match-list-entry')
      .forEach((entryElement: HTMLElement) => {
        const seriesName = domRepeat.itemForElement(entryElement);
        entryElement.style.color = this._determineColor(
          this._colorScale,
          seriesName
        );
      });
  }
}
