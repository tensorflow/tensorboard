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
import {addParams} from '../../../components/tf_backend/urlPathHelpers';
import '../../../components/tf_card_heading/tf-card-heading';
import {runsColorScale} from '../../../components/tf_color_scale/colorScale';
import {RequestDataCallback} from '../../../components/tf_dashboard_common/data-loader-behavior';
import '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import {TfLineChartDataLoader} from '../../../components/tf_line_chart_data_loader/tf-line-chart-data-loader';
import {
  multiscaleFormatter,
  relativeAccessor,
  relativeFormatter,
  ScalarDatum,
  stepFormatter,
  SYMBOLS_LIST,
  timeFormatter,
  Y_TOOLTIP_FORMATTER_PRECISION,
} from '../../../components/vz_chart_helpers/vz-chart-helpers';
import './tf-custom-scalar-card-style';
import {
  DataSeries,
  DataSeriesColorScale,
  generateDataSeriesName,
} from './tf-custom-scalar-helpers';

// Represents a `MarginChartContent.Series` proto.
interface MarginChartSeries {
  value: string;
  lower: string;
  upper: string;
}

interface StepsMismatch {
  valueSteps: number[];
  lowerSteps: number[];
  upperSteps: number[];
  seriesObject: MarginChartSeries;
}

type RunItem = string;
type CustomScalarsDatum = {
  regex_valid: boolean;
  tag_to_events: Record<string, ScalarDatum[]>;
};

export interface TfCustomScalarMarginChartCard extends HTMLElement {
  reload(): void;
}

@customElement('tf-custom-scalar-margin-chart-card')
class _TfCustomScalarMarginChartCard
  extends LegacyElementMixin(PolymerElement)
  implements TfCustomScalarMarginChartCard
{
  static readonly template = html`
    <tf-card-heading display-name="[[_titleDisplayString]]"></tf-card-heading>
    <div id="tf-line-chart-data-loader-container">
      <tf-line-chart-data-loader
        id="loader"
        active="[[active]]"
        color-scale="[[_colorScale]]"
        data-series="[[_seriesNames]]"
        fill-area="[[_fillArea]]"
        ignore-y-outliers="[[ignoreYOutliers]]"
        load-key="[[_tagFilter]]"
        data-to-load="[[runs]]"
        request-data="[[_requestData]]"
        log-scale-active="[[_logScaleActive]]"
        load-data-callback="[[_createProcessDataFunction(marginChartSeries)]]"
        request-manager="[[requestManager]]"
        symbol-function="[[_createSymbolFunction()]]"
        tooltip-columns="[[_tooltipColumns]]"
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

    <!-- here -->
    <template is="dom-if" if="[[_missingTags.length]]">
      <div class="collapsible-list-title">
        <paper-icon-button
          icon="[[_getToggleCollapsibleIcon(_missingTagsCollapsibleOpened)]]"
          on-click="_toggleMissingTagsCollapsibleOpen"
          class="toggle-collapsible-button"
        >
        </paper-icon-button>
        <span class="collapsible-title-text">
          <iron-icon icon="icons:error"></iron-icon> Missing Tags
        </span>
      </div>
      <iron-collapse opened="[[_missingTagsCollapsibleOpened]]">
        <div class="error-content">
          <iron-icon class="error-icon" icon="icons:error"></iron-icon>
          <template is="dom-repeat" items="[[_missingTags]]" as="missingEntry">
            <div class="missing-tags-for-run-container">
              Run "[[missingEntry.run]]" lacks data for tags
              <ul>
                <template
                  is="dom-repeat"
                  items="[[missingEntry.tags]]"
                  as="tag"
                >
                  <li>[[tag]]</li>
                </template>
              </ul>
            </div>
          </template>
        </div>
      </iron-collapse>
    </template>

    <template is="dom-if" if="[[_tagFilterInvalid]]">
      <div class="error-content">
        <iron-icon class="error-icon" icon="icons:error"></iron-icon>
        This regular expresion is invalid:<br />
        <span class="invalid-regex">[[_tagFilter]]</span>
      </div>
    </template>

    <template is="dom-if" if="[[_stepsMismatch]]">
      <div class="error-content">
        <iron-icon class="error-icon" icon="icons:error"></iron-icon>
        The steps for value, lower, and upper tags do not match:
        <ul>
          <li>
            <span class="tag-name">[[_stepsMismatch.seriesObject.value]]</span>:
            [[_separateWithCommas(_stepsMismatch.valueSteps)]]
          </li>
          <li>
            <span class="tag-name">[[_stepsMismatch.seriesObject.lower]]</span>:
            [[_separateWithCommas(_stepsMismatch.lowerSteps)]]
          </li>
          <li>
            <span class="tag-name">[[_stepsMismatch.seriesObject.upper]]</span>:
            [[_separateWithCommas(_stepsMismatch.upperSteps)]]
          </li>
        </ul>
      </div>
    </template>

    <div id="matches-container">
      <div class="collapsible-list-title">
        <template is="dom-if" if="[[_seriesNames.length]]">
          <paper-icon-button
            icon="[[_getToggleCollapsibleIcon(_matchesListOpened)]]"
            on-click="_toggleMatchesOpen"
            class="toggle-matches-button"
          >
          </paper-icon-button>
        </template>

        <span class="collapsible-title-text">
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
      .error-content {
        background: #f00;
        border-radius: 5px;
        color: #fff;
        margin: 10px 0 0 0;
        padding: 10px;
      }

      .error-icon {
        display: block;
        fill: #fff;
        margin: 0 auto 5px auto;
      }

      .invalid-regex {
        font-weight: bold;
      }

      .error-content ul {
        margin: 1px 0 0 0;
        padding: 0 0 0 19px;
      }

      .tag-name {
        font-weight: bold;
      }

      .collapsible-list-title {
        margin: 10px 0 5px 0;
      }

      .collapsible-title-text {
        vertical-align: middle;
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

      .missing-tags-for-run-container {
        margin: 8px 0 0 0;
      }
    </style>
  `;

  @property({type: Array})
  runs: unknown[];

  @property({type: String})
  xType: string;

  @property({type: Boolean})
  active: boolean = true;

  @property({type: String})
  override title: string;

  @property({type: Array})
  marginChartSeries: MarginChartSeries[];

  @property({type: Boolean})
  ignoreYOutliers: boolean;

  @property({type: Object})
  requestManager: RequestManager;

  @property({type: Boolean})
  showDownloadLinks: boolean;

  @property({type: Object})
  tagMetadata: object;

  @property({type: String})
  tooltipSortingMethod: string;

  @property({type: Object})
  _colorScale: object = new DataSeriesColorScale({
    scale: runsColorScale,
  } as any);

  @property({type: Boolean})
  _tagFilterInvalid: boolean;

  @property({type: Object})
  _nameToDataSeries: Record<string, DataSeries> = {};

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

  @property({type: Object})
  _fillArea: object = {
    lowerAccessor: (d) => d.lower,
    higherAccessor: (d) => d.upper,
  };

  @property({type: Array})
  _tooltipColumns: unknown[] = (() => {
    const valueFormatter = multiscaleFormatter(Y_TOOLTIP_FORMATTER_PRECISION);
    const formatValueOrNaN = (x) => (isNaN(x) ? 'NaN' : valueFormatter(x));
    return [
      {
        title: 'Name',
        evaluate: (d) => d.dataset.metadata().name,
      },
      {
        title: 'Value',
        evaluate: (d) => formatValueOrNaN(d.datum.scalar),
      },
      {
        title: 'Lower Margin',
        evaluate: (d) => formatValueOrNaN(d.datum.lower),
      },
      {
        title: 'Upper Margin',
        evaluate: (d) => formatValueOrNaN(d.datum.upper),
      },
      {
        title: 'Step',
        evaluate: (d) => stepFormatter(d.datum.step),
      },
      {
        title: 'Time',
        evaluate: (d) => timeFormatter(d.datum.wall_time),
      },
      {
        title: 'Relative',
        evaluate: (d) =>
          relativeFormatter(relativeAccessor(d.datum, -1, d.dataset)),
      },
    ];
  })();

  @property({type: Array})
  _missingTags: Array<{run: string; tags: string[]}> = [];

  @property({type: Boolean})
  _missingTagsCollapsibleOpened: boolean = false;

  /**
   * This field is only set if data retrieved from the server exhibits a
   * step mismatch: if the lists of values, lower bounds, and upper bounds
   * do not match in step.
   */
  @property({type: Object})
  _stepsMismatch: StepsMismatch | null;

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
  _csvUrl(_nameToDataSeries, dataSeriesName) {
    if (!dataSeriesName) return '';
    const baseUrl = this._downloadDataUrl(_nameToDataSeries, dataSeriesName);
    return addParams(baseUrl, {format: 'csv'});
  }
  _jsonUrl(_nameToDataSeries, dataSeriesName) {
    if (!dataSeriesName) return '';
    const baseUrl = this._downloadDataUrl(_nameToDataSeries, dataSeriesName);
    return addParams(baseUrl, {format: 'json'});
  }
  _downloadDataUrl(_nameToDataSeries, dataSeriesName) {
    const dataSeries = _nameToDataSeries[dataSeriesName];
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

  _createProcessDataFunction(marginChartSeries) {
    // This function is called when data is received from the backend.
    return (scalarChart, run, data) => {
      if (!data.regex_valid) {
        // The regular expression is constructed from frontend logic that
        // pieces together different tags. Hence, this case should never be
        // reached if the dashboard behaves correctly.
        this.set('_tagFilterInvalid', true);
        return;
      }
      // The user's regular expression was valid.
      // Incorporate these newly loaded values.
      const newMapping = _.clone(this._nameToDataSeries);
      const tagsNotFound: any[] = [];
      _.forEach(marginChartSeries, (tagsObject) => {
        let tagNotFound = false;
        const scalarEvents = data.tag_to_events[tagsObject.value];
        const lowerBounds = data.tag_to_events[tagsObject.lower];
        const upperBounds = data.tag_to_events[tagsObject.upper];
        // Make sure that data is found for each of the tags.
        if (_.isUndefined(scalarEvents)) {
          tagsNotFound.push(tagsObject.value);
          tagNotFound = true;
        }
        if (_.isUndefined(lowerBounds)) {
          tagsNotFound.push(tagsObject.lower);
          tagNotFound = true;
        }
        if (_.isUndefined(upperBounds)) {
          tagsNotFound.push(tagsObject.upper);
          tagNotFound = true;
        }
        // At least one of the tags lacks data. We terminate early because
        // the line chart requires all 3 pieces of data (value, lower bound,
        // and upper bound).
        if (tagNotFound) {
          return;
        }
        // Make sure that steps for all the lists correspond with each
        // other. Otherwise, display an error message.
        const obtainStep = (datum) => datum[1];
        const stepsMismatch = this._findStepMismatch(
          tagsObject,
          scalarEvents.map(obtainStep),
          lowerBounds.map(obtainStep),
          upperBounds.map(obtainStep)
        );
        if (stepsMismatch) {
          this.set('_stepsMismatch', stepsMismatch);
          return;
        }
        // Create data points that the line chart can parse.
        const obtainNumber = (datum) => datum[2];
        const dataPoints = scalarEvents.map((datum, i) => ({
          wall_time: new Date(datum[0] * 1000),
          step: obtainStep(datum),
          scalar: obtainNumber(datum),
          lower: obtainNumber(lowerBounds[i]),
          upper: obtainNumber(upperBounds[i]),
        }));
        // Compute the series name, which is based on both the run and the
        // tag of the value.
        const seriesName = generateDataSeriesName(run, tagsObject.value);
        const series = newMapping[seriesName];
        if (series) {
          // This series already exists.
          series.setData(dataPoints);
        } else {
          const series = this._createNewDataSeries(
            run,
            tagsObject.value,
            seriesName,
            dataPoints
          );
          newMapping[seriesName] = series;
        }
      });
      this.set('_nameToDataSeries', newMapping);
      const entryIndex = _.findIndex(this._missingTags, (entry) => {
        return entry.run === run;
      });
      if (tagsNotFound.length && tagsNotFound.length != 3) {
        // Some but not all tags were found. Show a warning message.
        const entry = {
          run: run,
          tags: tagsNotFound,
        };
        if (entryIndex >= 0) {
          // Remove the previous entry. Insert the new one.
          this.splice('_missingTags', entryIndex, 1, entry);
        } else {
          // Insert a new entry.
          this.push('_missingTags', entry);
        }
      } else if (entryIndex >= 0) {
        // Remove the previous entry if it exists.
        this.splice('_missingTags', entryIndex, 1);
      }
    };
  }

  _findStepMismatch(tagsObject, valueSteps, lowerSteps, upperSteps) {
    if (
      _.isEqual(lowerSteps, valueSteps) &&
      _.isEqual(upperSteps, valueSteps)
    ) {
      // There is no mismatch.
      return null;
    }
    return {
      seriesObject: tagsObject,
      valueSteps: valueSteps,
      lowerSteps: lowerSteps,
      upperSteps: upperSteps,
    };
  }

  _createNewDataSeries(run, tag, seriesName, dataPoints) {
    // If the run has not been seen before, define the next
    // available marker index.
    this._runToNextAvailableSymbolIndex[run] |= 0;
    // Every data series within a run has a unique symbol.
    const lineChartSymbol =
      SYMBOLS_LIST[this._runToNextAvailableSymbolIndex[run]];
    // Create a series with this name.
    const series = new DataSeries(
      run,
      tag,
      seriesName,
      dataPoints,
      lineChartSymbol
    );
    // Loop back to the beginning if we are out of symbols.
    const numSymbols = SYMBOLS_LIST.length;
    this._runToNextAvailableSymbolIndex[run] =
      (this._runToNextAvailableSymbolIndex[run] + 1) % numSymbols;
    return series;
  }

  @observe('_nameToDataSeries')
  _updateChart() {
    var _nameToDataSeries = this._nameToDataSeries;
    // Add new data series.
    _.forOwn(_nameToDataSeries, (dataSeries) => {
      (this.$.loader as TfLineChartDataLoader).setSeriesData(
        dataSeries.getName(),
        dataSeries.getData()
      );
    });
    (this.$.loader as TfLineChartDataLoader).commitChanges();
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

  _determineSymbol(_nameToDataSeries, seriesName) {
    return _nameToDataSeries[seriesName].getSymbol().character;
  }

  @computed('marginChartSeries')
  get _tagFilter(): string {
    var marginChartSeries = this.marginChartSeries;
    const tags = _.flatten(
      marginChartSeries.map((series) => [
        series.value,
        series.lower,
        series.upper,
      ])
    );
    const escapedTags = tags.map(
      (r) => '(' + this._escapeRegexCharacters(r) + ')'
    );
    // Combine the different regexes into a single regex.
    return escapedTags.join('|');
  }

  _escapeRegexCharacters(stringValue) {
    return stringValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _getToggleCollapsibleIcon(listOpened) {
    return listOpened ? 'expand-less' : 'expand-more';
  }

  _toggleMatchesOpen() {
    this.set('_matchesListOpened', !this._matchesListOpened);
  }

  @computed('title')
  get _titleDisplayString(): string {
    var title = this.title;
    // If no title is provided, use the tag filter, which is a combination
    // of the tags for the value, lower, and upper fields of each series.
    return title || 'untitled';
  }

  _separateWithCommas(numbers) {
    return numbers.join(', ');
  }

  _toggleMissingTagsCollapsibleOpen() {
    this.set(
      '_missingTagsCollapsibleOpened',
      !this._missingTagsCollapsibleOpened
    );
  }

  _matchListEntryColorUpdated() {
    const domRepeat = this.$$('#match-list-repeat') as DomRepeat | null;
    if (!domRepeat) {
      return;
    }
    this.root
      ?.querySelectorAll('.match-list-entry')
      .forEach((entryElement: HTMLDivElement) => {
        const seriesName = domRepeat.itemForElement(entryElement);
        entryElement.style.color = this._determineColor(
          this._colorScale,
          seriesName
        );
      });
  }
}
