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
import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import * as Plottable from 'plottable';
import '../polymer/irons_and_papers';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import {RequestManager} from '../tf_backend/requestManager';
import {
  RUN_COLOR_MAP_CHANGED_EVENT,
  runsColorScale,
} from '../tf_color_scale/colorScale';
import {DataLoaderBehavior} from '../tf_dashboard_common/data-loader-behavior';
import {
  AxisScaleType,
  ScalarDatum,
  SymbolFn,
  TooltipColumn,
  XType,
} from '../vz_chart_helpers/vz-chart-helpers';
import {FillArea, YScaleType} from '../vz_line_chart2/line-chart';
import '../vz_line_chart2/vz-line-chart2';

export interface TfLineChartDataLoader extends HTMLElement {
  commitChanges(): void;
  redraw(): void;
  reload(): void;
  resetDomain(): void;
  setSeriesData(name: string, data: ScalarDatum[]): void;
}

// The chart can sometimes get in a bad state, when it redraws while
// it is display: none due to the user having switched to a different
// page. This code implements a cascading queue to redraw the bad charts
// one-by-one once they are active again.
// We use a cascading queue becuase we don't want to block the UI / make the
// ripples very slow while everything synchronously redraws.
const redrawQueue: _TfLineChartDataLoader<any>[] = [];
let redrawRaf = 0;
const cascadingRedraw = _.throttle(function internalRedraw() {
  if (redrawQueue.length == 0) return;
  const x = redrawQueue.shift();
  if (x && x.active) {
    x.redraw();
    x._maybeRenderedInBadState = false;
  }
  window.cancelAnimationFrame(redrawRaf);
  redrawRaf = window.requestAnimationFrame(internalRedraw);
}, 100);

// A component that fetches data from the TensorBoard server and renders it into
// a vz-line-chart.
@customElement('tf-line-chart-data-loader')
class _TfLineChartDataLoader<ScalarMetadata>
  extends DataLoaderBehavior<string, ScalarDatum[]>(
    LegacyElementMixin(PolymerElement)
  )
  implements TfLineChartDataLoader
{
  static readonly template = html`
    <div id="chart-and-spinner-container">
      <vz-line-chart2
        id="chart"
        data-loading$="[[dataLoading]]"
        data-loaded-once$="[[dataLoadedAtLeastOnce]]"
        color-scale="[[colorScale]]"
        default-x-range="[[defaultXRange]]"
        default-y-range="[[defaultYRange]]"
        fill-area="[[fillArea]]"
        ignore-y-outliers="[[ignoreYOutliers]]"
        on-chart-attached="_onChartAttached"
        smoothing-enabled="[[smoothingEnabled]]"
        smoothing-weight="[[smoothingWeight]]"
        symbol-function="[[symbolFunction]]"
        tooltip-columns="[[tooltipColumns]]"
        tooltip-position="[[tooltipPosition]]"
        tooltip-sorting-method="[[tooltipSortingMethod]]"
        x-scale-type="[[xScaleType]]"
        x-components-creation-method="[[xComponentsCreationMethod]]"
        x-type="[[xType]]"
        y-scale-type="[[yScaleType]]"
        y-value-accessor="[[yValueAccessor]]"
      ></vz-line-chart2>
      <template is="dom-if" if="[[dataLoading]]">
        <div id="loading-spinner-container">
          <paper-spinner-lite active=""></paper-spinner-lite>
        </div>
      </template>
    </div>
    <style>
      :host {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
      }

      :host([_maybe-rendered-in-bad-state]) vz-line-chart {
        visibility: hidden;
      }

      #chart-and-spinner-container {
        display: flex;
        flex-grow: 1;
        position: relative;
      }

      #loading-spinner-container {
        align-items: center;
        bottom: 0;
        display: flex;
        display: flex;
        justify-content: center;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 0;
        top: 0;
      }

      vz-line-chart2 {
        -webkit-user-select: none;
        -moz-user-select: none;
      }

      vz-line-chart2[data-loading] {
        opacity: 0.3;
      }
    </style>
  `;

  private _redrawRaf: number | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _runColorMapChangedListener: (() => void) | null = null;
  private _lastObservedWidth = -1;
  private _lastObservedHeight = -1;

  override connectedCallback() {
    super.connectedCallback();
    this._runColorMapChangedListener = () => {
      if (this.active) {
        if (!redrawQueue.includes(this)) {
          redrawQueue.push(this);
        }
        cascadingRedraw();
      } else {
        this._maybeRenderedInBadState = true;
      }
    };
    window.addEventListener(
      RUN_COLOR_MAP_CHANGED_EVENT,
      this._runColorMapChangedListener
    );
    this._resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return;
      const {width, height} = entries[0].contentRect;
      const roundedWidth = Math.round(width);
      const roundedHeight = Math.round(height);
      if (
        roundedWidth === this._lastObservedWidth &&
        roundedHeight === this._lastObservedHeight
      ) {
        return;
      }
      this._lastObservedWidth = roundedWidth;
      this._lastObservedHeight = roundedHeight;

      if (roundedWidth <= 0 || roundedHeight <= 0 || !this.active) {
        this._maybeRenderedInBadState = true;
        return;
      }

      if (!redrawQueue.includes(this)) {
        redrawQueue.push(this);
      }
      cascadingRedraw();
    });
    this._resizeObserver.observe(this);
  }

  @property({
    type: Boolean,
    observer: '_fixBadStateWhenActive',
  })
  override active: boolean = false;

  @property({type: Array})
  dataSeries!: string[];

  @property({type: Object})
  requestManager!: RequestManager;

  @property({
    type: Boolean,
    observer: '_logScaleChanged',
  })
  logScaleActive: boolean = false;

  @property({type: String})
  xScaleType: AxisScaleType = AxisScaleType.LINEAR;

  @property({type: String})
  yScaleType: YScaleType = YScaleType.LINEAR;

  @property({type: Object})
  xComponentsCreationMethod?: any;

  @property({type: String})
  xType?: XType;

  @property({type: Object})
  yValueAccessor?: Plottable.IAccessor<number>;

  @property({type: Object})
  fillArea?: FillArea;

  @property({type: Boolean})
  smoothingEnabled?: boolean;

  @property({type: Number})
  smoothingWeight?: number;

  @property({type: Array})
  tooltipColumns?: TooltipColumn[];

  @property({type: String})
  tooltipSortingMethod?: any;

  @property({type: String})
  tooltipPosition?: string;

  @property({type: Boolean})
  ignoreYOutliers?: boolean;

  @property({type: Array})
  defaultXRange?: number[];

  @property({type: Array})
  defaultYRange?: number[];

  @property({type: Object})
  symbolFunction?: SymbolFn;

  @property({type: Object})
  colorScale = {scale: runsColorScale};

  @property({type: Boolean})
  _resetDomainOnNextLoad: boolean = true;

  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  _maybeRenderedInBadState: boolean = false;

  onLoadFinish() {
    this.commitChanges();
    if (this.dataToLoad.length > 0 && this._resetDomainOnNextLoad) {
      // (Don't unset _resetDomainOnNextLoad when we didn't
      // load any runs: this has the effect that if all our
      // runs are deselected, then we toggle them all on, we
      // properly size the domain once all the data is loaded
      // instead of just when we're first rendered.)
      this._resetDomainOnNextLoad = false;
      this.getChart().resetDomain();
    }
    this.redraw();
  }

  override disconnectedCallback() {
    if (this._runColorMapChangedListener !== null) {
      window.removeEventListener(
        RUN_COLOR_MAP_CHANGED_EVENT,
        this._runColorMapChangedListener
      );
      this._runColorMapChangedListener = null;
    }
    if (this._resizeObserver !== null) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    super.disconnectedCallback();
    if (this._redrawRaf !== null) cancelAnimationFrame(this._redrawRaf);
  }

  exportAsSvgString() {
    const exporter = this.getChart().getExporter();
    return exporter.exportAsString();
  }

  private getChart(): any {
    return this.$.chart as unknown as any;
  }

  resetDomain() {
    this.getChart().resetDomain();
  }

  setSeriesData(name: string, data: ScalarDatum[]) {
    this.getChart().setSeriesData(name, data);
  }

  setSeriesMetadata(name: string, metadata: ScalarMetadata) {
    this.getChart().setSeriesMetadata(name, metadata);
  }

  commitChanges() {
    this.getChart().commitChanges();
  }

  redraw() {
    if (this._redrawRaf !== null) cancelAnimationFrame(this._redrawRaf);
    this._redrawRaf = window.requestAnimationFrame(() => {
      if (this.active) {
        this.getChart().redraw();
      } else {
        // If we reached a point where we should render while the page
        // is not active, we've gotten into a bad state.
        this._maybeRenderedInBadState = true;
      }
    });
  }

  @observe('loadKey')
  _loadKeyChanged() {
    this.reset();
    this._resetDomainOnNextLoad = true;
  }

  @observe('dataSeries.*')
  _dataSeriesChanged() {
    // Setting visible series redraws the chart.
    this.getChart().setVisibleSeries(this.dataSeries);
  }

  private _logScaleChanged(logScaleActive: boolean) {
    this.yScaleType = logScaleActive ? YScaleType.LOG : YScaleType.LINEAR;
  }

  private _fixBadStateWhenActive() {
    // When the chart enters a potentially bad state (because it should
    // redraw, but the page is not currently active), we set the
    // _maybeRenderedInBadState flag. Whenever the chart becomes active,
    // we test this and schedule a redraw of the bad charts.
    if (this.active && this._maybeRenderedInBadState) {
      redrawQueue.push(this);
      cascadingRedraw();
    }
  }

  private _onChartAttached() {
    if (!this.active) {
      this._maybeRenderedInBadState = true;
    }
  }
}
