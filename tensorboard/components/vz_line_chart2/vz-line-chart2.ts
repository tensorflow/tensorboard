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
import {PolymerElement, html} from '@polymer/polymer';
import {LegacyElementMixin} from '@polymer/polymer/lib/legacy/legacy-element-mixin';
import {customElement, property, observe} from '@polymer/decorators';
import * as d3 from 'd3';
import * as Plottable from 'plottable';
import * as _ from 'lodash';
import * as vz_chart_helpers from '../vz_chart_helpers/vz-chart-helpers';
import '../vz_chart_helpers/vz-chart-tooltip';
import {TooltipPosition} from '../vz_chart_helpers/vz-chart-tooltip';
import {LineChart, FillArea, TooltipSortingMethod} from './line-chart';
import {PanZoomDragLayer} from './panZoomDragLayer';
import {LineChartExporter} from './line-chart-exporter';
import '../tf_dashboard_common/plottable-style';

const valueFormatter = vz_chart_helpers.multiscaleFormatter(
  vz_chart_helpers.Y_TOOLTIP_FORMATTER_PRECISION
);

const formatValueOrNaN = (x: number) => (isNaN(x) ? 'NaN' : valueFormatter(x));

export const DEFAULT_TOOLTIP_COLUMNS: Readonly<
  vz_chart_helpers.TooltipColumn[]
> = [
  {
    title: 'Name',
    evaluate: (d: vz_chart_helpers.Point) => d.dataset.metadata().name,
  },
  {
    title: 'Smoothed',
    evaluate(d, statusObject) {
      const smoothingEnabled = statusObject && statusObject.smoothingEnabled;
      return formatValueOrNaN(
        smoothingEnabled ? d.datum.smoothed! : d.datum.scalar
      );
    },
  },
  {
    title: 'Value',
    evaluate: (d: vz_chart_helpers.Point) => formatValueOrNaN(d.datum.scalar),
  },
  {
    title: 'Step',
    evaluate: (d: vz_chart_helpers.Point) =>
      vz_chart_helpers.stepFormatter(d.datum.step),
  },
  {
    title: 'Time',
    evaluate: (d: vz_chart_helpers.Point) =>
      vz_chart_helpers.timeFormatter(d.datum.wall_time),
  },
  {
    title: 'Relative',
    evaluate: (d: vz_chart_helpers.Point) =>
      vz_chart_helpers.relativeFormatter(
        vz_chart_helpers.relativeAccessor(d.datum, -1, d.dataset)
      ),
  },
];

type NumberFormatter = (num: number) => string;

@customElement('vz-line-chart2')
export class VzLineChart2<Metadata> extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div id="chartdiv"></div>
    <vz-chart-tooltip
      id="tooltip"
      position="[[tooltipPosition]]"
      content-component-name="vz-line-chart-tooltip"
    ></vz-chart-tooltip>
    <style include="plottable-style"></style>
    <style include="vz-pan-zoom-style"></style>
    <style>
      :host {
        -moz-user-select: none;
        -webkit-user-select: none;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        flex-shrink: 1;
        outline: none;
        position: relative;
        white-space: nowrap;
      }
      div {
        -webkit-user-select: none;
        -moz-user-select: none;
        flex-grow: 1;
        flex-shrink: 1;
      }

      #chartdiv .main {
        cursor: crosshair;
      }

      :host(.pankey) #chartdiv :not(.drag-zooming) .main {
        cursor: -webkit-grab;
        cursor: grab;
      }

      :host(.mousedown) #chartdiv .panning .main {
        cursor: -webkit-grabbing;
        cursor: grabbing;
      }

      #chartdiv line.guide-line {
        stroke: #999;
        stroke-width: 1.5px;
      }
      #chartdiv:hover {
        will-change: transform;
      }

      .ghost {
        opacity: 0.2;
        stroke-width: 1px;
      }
    </style>
  `;

  @property({
    type: Object,
  })
  colorScale = new Plottable.Scales.Color().range(d3.schemeCategory10.slice());

  @property({type: Object})
  symbolFunction?: vz_chart_helpers.SymbolFn;

  @property({
    type: Boolean,
    notify: true,
  })
  smoothingEnabled: boolean = false;

  @property({type: Number})
  smoothingWeight: number = 0.6;

  @property({type: String})
  xType?: vz_chart_helpers.XType;

  @property({
    type: Object,
  })
  xComponentsCreationMethod?: () => vz_chart_helpers.XComponents;

  @property({type: Object})
  xAxisFormatter?: NumberFormatter;

  @property({type: Object})
  yValueAccessor: Plottable.IAccessor<number> = (d) => d.scalar;

  @property({
    type: Array,
  })
  tooltipColumns = DEFAULT_TOOLTIP_COLUMNS;

  @property({type: Object})
  fillArea?: FillArea;

  @property({type: Array})
  defaultXRange?: number[];

  @property({type: Array})
  defaultYRange?: number[];

  @property({type: String})
  yScaleType: string = 'linear';

  @property({
    type: Boolean,
  })
  ignoreYOutliers: boolean = false;

  @property({type: String})
  tooltipSortingMethod: TooltipSortingMethod = TooltipSortingMethod.DEFAULT;

  @property({type: String})
  tooltipPosition: TooltipPosition = TooltipPosition.BOTTOM;

  @property({type: Object})
  _chart?: LineChart;

  @property({
    type: Array,
  })
  _visibleSeriesCache: string[] = [];

  @property({
    type: Object,
  })
  _seriesDataCache: {[name: string]: vz_chart_helpers.ScalarDatum[]} = {};

  @property({type: Number})
  _makeChartAsyncCallbackId: number | null = null;

  @property({
    type: Object,
  })
  _seriesMetadataCache: {[name: string]: Metadata} = {};

  private _listeners = new Set<{
    node: EventTarget;
    eventName: string;
    func: (event: Event) => void;
    option: {passive?: boolean; capture?: boolean};
  }>();

  ready() {
    super.ready();
    this.scopeSubtree(this.$.chartdiv, true);
  }

  attached() {
    // `capture` ensures that no handler can stop propagation and break the
    // handler. `passive` ensures that browser does not wait renderer thread
    // on JS handler (which can prevent default and impact rendering).
    const option = {capture: true, passive: true};
    this._listen(this, 'mousedown', this._onMouseDown.bind(this), option);
    this._listen(this, 'mouseup', this._onMouseUp.bind(this), option);
    this._listen(window, 'keydown', this._onKeyDown.bind(this), option);
    this._listen(window, 'keyup', this._onKeyUp.bind(this), option);
  }
  detached() {
    if (this._makeChartAsyncCallbackId !== null) {
      this.cancelAsync(this._makeChartAsyncCallbackId);
    }
    if (this._chart) this._chart.destroy();
    if (this._listeners) {
      this._listeners.forEach(({node, eventName, func, option}) => {
        node.removeEventListener(eventName, func, option);
      });
      this._listeners.clear();
    }
  }
  _listen(
    node: EventTarget,
    eventName: string,
    func: (event: Event) => void,
    option = {}
  ) {
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add({node, eventName, func, option});
    node.addEventListener(eventName, func, option);
  }
  _onKeyDown(event: MouseEvent) {
    this.toggleClass('pankey', PanZoomDragLayer.isPanKey(event));
  }
  _onKeyUp(event: MouseEvent) {
    this.toggleClass('pankey', PanZoomDragLayer.isPanKey(event));
  }
  _onMouseDown(event: MouseEvent) {
    this.toggleClass('mousedown', true);
  }
  _onMouseUp(event: MouseEvent) {
    this.toggleClass('mousedown', false);
  }
  /**
   * Sets the series that the chart displays. Series with other names will
   * not be displayed.
   */
  setVisibleSeries(names: string[]) {
    if (_.isEqual(this._visibleSeriesCache, names)) return;
    this._visibleSeriesCache = names;
  }
  /**
   * Sets the data of one of the series. Note that to display this series
   * its name must be in the setVisibleSeries() array.
   */
  setSeriesData(name: string, data: vz_chart_helpers.ScalarDatum[]) {
    this._seriesDataCache[name] = data;
    if (this._chart) {
      this._chart.setSeriesData(name, data);
    }
  }
  /**
   * Sets the metadata of one of the series.
   */
  setSeriesMetadata(name: string, meta: Metadata) {
    this._seriesMetadataCache[name] = meta;
    if (this._chart) {
      this._chart!.setSeriesMetadata(name, meta);
    }
  }
  /**
   * Reset the chart domain. If the chart has not rendered yet, a call to this
   * method no-ops.
   */
  resetDomain() {
    if (this._chart) {
      this._chart.resetDomain();
    }
  }
  /**
   * Re-renders the chart. Useful if e.g. the container size changed.
   */
  redraw() {
    if (this._chart) {
      this._chart.redraw();
    }
  }
  /**
   * Creates a chart, and asynchronously renders it. Fires a chart-rendered
   * event after the chart is rendered.
   */
  @observe(
    'xComponentsCreationMethod',
    'xType',
    'yValueAccessor',
    'yScaleType',
    'tooltipColumns',
    'colorScale',
    'isAttached'
  )
  _makeChart() {
    let {xComponentsCreationMethod, xType, yScaleType, colorScale} = this;
    // Find the actual xComponentsCreationMethod.
    if (!xType && !xComponentsCreationMethod) {
      xComponentsCreationMethod = vz_chart_helpers.stepX;
    } else if (xType) {
      xComponentsCreationMethod = () => vz_chart_helpers.getXComponents(xType!);
    }
    if (this._makeChartAsyncCallbackId !== null) {
      this.cancelAsync(this._makeChartAsyncCallbackId);
      this._makeChartAsyncCallbackId = null;
    }
    this._makeChartAsyncCallbackId = this.async(function() {
      this._makeChartAsyncCallbackId = null;
      if (
        !xComponentsCreationMethod ||
        !this.yValueAccessor ||
        !this.tooltipColumns
      ) {
        return;
      }
      // We directly reference properties of `this` because this call is
      // asynchronous, and values may have changed in between the call being
      // initiated and actually being run.
      var chart = new LineChart(
        xComponentsCreationMethod,
        this.yValueAccessor,
        yScaleType,
        colorScale,
        this.$.tooltip,
        this.tooltipColumns,
        this.fillArea,
        this.defaultXRange,
        this.defaultYRange,
        this.symbolFunction,
        this.xAxisFormatter
      );
      var div = d3.select(this.$.chartdiv);
      chart.renderTo(div);
      if (this._chart) this._chart.destroy();
      this._chart = chart;
      this._chart.onAnchor(() => this.fire('chart-attached'));
    }, 350);
  }

  @observe('_chart', '_visibleSeriesCache')
  _reloadFromCache() {
    if (!this._chart) return;
    this._visibleSeriesCache.forEach((name) => {
      this._chart!.setSeriesData(name, this._seriesDataCache[name] || []);
    });
    this._visibleSeriesCache
      .filter((name) => this._seriesMetadataCache[name])
      .forEach((name) => {
        this._chart!.setSeriesMetadata(name, this._seriesMetadataCache[name]);
      });
    this._chart.setVisibleSeries(this._visibleSeriesCache);
  }
  @observe('smoothingEnabled', 'smoothingWeight', '_chart')
  _smoothingChanged() {
    if (!this._chart) return;
    if (this.smoothingEnabled) {
      this._chart.smoothingUpdate(this.smoothingWeight);
    } else {
      this._chart.smoothingDisable();
    }
  }
  @observe('ignoreYOutliers', '_chart')
  _outliersChanged() {
    if (!this._chart) return;
    this._chart.ignoreYOutliers(this.ignoreYOutliers);
  }
  @observe('tooltipSortingMethod', '_chart')
  _tooltipSortingMethodChanged() {
    if (!this._chart) return;
    this._chart.setTooltipSortingMethod(this.tooltipSortingMethod);
  }
  getExporter() {
    return new LineChartExporter(this.$.chartdiv);
  }
}

@customElement('vz-line-chart-tooltip')
export class VzLineChartTooltip extends PolymerElement {
  static readonly template = html`
    <div class="content">
      <table>
        <thead></thead>
        <tbody></tbody>
      </table>
    </div>
    <style>
      :host {
        pointer-events: none;
      }
      .content {
        background: rgba(0, 0, 0, 0.8);
        border-radius: 4px;
        color: #fff;
        overflow: hidden;
        pointer-events: none;
      }
      table {
        font-size: 13px;
        line-height: 1.4em;
        margin-top: 10px;
        padding: 8px;
      }
      thead {
        font-size: 14px;
      }
      tbody {
        font-size: 13px;
        line-height: 21px;
        white-space: nowrap;
      }
      td {
        padding: 0 5px;
      }
      .swatch {
        border-radius: 50%;
        display: block;
        height: 18px;
        width: 18px;
      }
      .closest .swatch {
        box-shadow: inset 0 0 0 2px #fff;
      }
      th {
        padding: 0 5px;
        text-align: left;
      }
      .distant td:not(.swatch) {
        opacity: 0.8;
      }
      .ghost {
        opacity: 0.2;
        stroke-width: 1px;
      }
    </style>
  `;
}
