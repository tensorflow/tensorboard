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
import '@polymer/iron-collapse';
import '@polymer/iron-icon';
import '@polymer/paper-icon-button';
import '@polymer/paper-item';
import '@polymer/paper-dropdown-menu';
import '@polymer/paper-icon-button';
import '@polymer/paper-input';
import '@polymer/paper-listbox';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-line-chart-data-loader/tf-line-chart-data-loader.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from 'tf-custom-scalar-card-style.html';
import {DO_NOT_SUBMIT} from 'tf-custom-scalar-helpers.html';
import '@polymer/iron-collapse';
import '@polymer/iron-icon';
import '@polymer/paper-icon-button';
import '@polymer/paper-item';
import '@polymer/paper-dropdown-menu';
import '@polymer/paper-icon-button';
import '@polymer/paper-input';
import '@polymer/paper-listbox';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-line-chart-data-loader/tf-line-chart-data-loader.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from 'tf-custom-scalar-card-style.html';
import {DO_NOT_SUBMIT} from 'tf-custom-scalar-helpers.html';
@customElement('tf-custom-scalar-multi-line-chart-card')
class TfCustomScalarMultiLineChartCard extends PolymerElement {
  static readonly template = html`
    <tf-card-heading display-name="[[_titleDisplayString]]"></tf-card-heading>
    <div id="tf-line-chart-data-loader-container">
      <tf-line-chart-data-loader
        id="loader"
        active="[[active]]"
        color-scale="[[_colorScale]]"
        data-series="[[_seriesNames]]"
        get-data-load-url="[[_dataUrl]]"
        ignore-y-outliers="[[ignoreYOutliers]]"
        load-key="[[_tagFilter]]"
        data-to-load="[[runs]]"
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

        <span class="matches-text">
          Matches ([[_seriesNames.length]])
        </span>
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
  runs: unknown[];
  @property({type: String})
  xType: string;
  @property({
    type: Boolean,
    readOnly: true,
  })
  active: boolean = true;
  @property({type: String})
  title: string;
  @property({type: Array})
  tagRegexes: unknown[];
  @property({type: Boolean})
  ignoreYOutliers: boolean;
  @property({type: Object})
  requestManager: object;
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
  @property({
    type: Object,
    readOnly: true,
  })
  _colorScale: object = new tf_custom_scalar_dashboard.DataSeriesColorScale({
    scale: tf_color_scale.runsColorScale,
  });
  @property({
    type: Object,
  })
  _nameToDataSeries: object = () => ({});
  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  _expanded: boolean = false;
  @property({type: Boolean})
  _logScaleActive: boolean;
  @property({
    type: Function,
  })
  _dataUrl: object = function() {
    return (run) => {
      const tag = this._tagFilter;
      return tf_backend.addParams(
        tf_backend.getRouter().pluginRoute('custom_scalars', '/scalars'),
        {tag, run}
      );
    };
  };
  @property({
    type: Object,
  })
  _runToNextAvailableSymbolIndex: object = {};
  @property({
    type: Boolean,
  })
  _matchesListOpened: boolean = false;
  reload() {
    this.$.loader.reload();
  }
  redraw() {
    this.$.loader.redraw();
  }
  _toggleExpanded(e) {
    this.set('_expanded', !this._expanded);
    this.redraw();
  }
  _toggleLogScale() {
    this.set('_logScaleActive', !this._logScaleActive);
  }
  _resetDomain() {
    const chart = this.$.loader;
    if (chart) {
      chart.resetDomain();
    }
  }
  _csvUrl(nameToSeries, dataSeriesName) {
    if (!dataSeriesName) return '';
    const baseUrl = this._downloadDataUrl(nameToSeries, dataSeriesName);
    return tf_backend.addParams(baseUrl, {format: 'csv'});
  }
  _jsonUrl(nameToSeries, dataSeriesName) {
    if (!dataSeriesName) return '';
    const baseUrl = this._downloadDataUrl(nameToSeries, dataSeriesName);
    return tf_backend.addParams(baseUrl, {format: 'json'});
  }
  _downloadDataUrl(nameToSeries, dataSeriesName) {
    const dataSeries = nameToSeries[dataSeriesName];
    const getVars = {
      tag: dataSeries.getTag(),
      run: dataSeries.getRun(),
    };
    return tf_backend.addParams(
      tf_backend.getRouter().pluginRoute('custom_scalars', '/download_data'),
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
          const seriesName = tf_custom_scalar_dashboard.generateDataSeriesName(
            run,
            tag
          );
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
              vz_chart_helpers.SYMBOLS_LIST[
                this._runToNextAvailableSymbolIndex[run]
              ];
            // Create a series with this name.
            const series = new tf_custom_scalar_dashboard.DataSeries(
              run,
              tag,
              seriesName,
              data,
              lineChartSymbol
            );
            newMapping[seriesName] = series;
            // Loop back to the beginning if we are out of symbols.
            const numSymbols = vz_chart_helpers.SYMBOLS_LIST.length;
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
      this.$.loader.setSeriesData(name, series.getData());
    });
    this.$.loader.commitChanges();
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
    const domRepeat = this.$$('#match-list-repeat');
    if (!domRepeat) {
      return;
    }
    this.root.querySelectorAll('.match-list-entry').forEach((entryElement) => {
      const seriesName = domRepeat.itemForElement(entryElement);
      entryElement.style.color = this._determineColor(
        this._colorScale,
        seriesName
      );
    });
  }
}
