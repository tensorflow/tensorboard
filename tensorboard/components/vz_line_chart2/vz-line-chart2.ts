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
import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as d3 from 'd3';
import * as _ from 'lodash';
import * as Plottable from 'plottable';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import '../polymer/plottable-style';
import {
  getXComponents,
  multiscaleFormatter,
  Point,
  relativeAccessor,
  relativeFormatter,
  stepFormatter,
  stepX,
  SymbolFn,
  timeFormatter,
  TooltipColumn,
  XComponents,
  XType,
  Y_TOOLTIP_FORMATTER_PRECISION,
} from '../vz_chart_helpers/vz-chart-helpers';
import {TooltipPosition} from '../vz_chart_helpers/vz-chart-tooltip';
import {FillArea, LineChart, LineChartStatus, YScaleType} from './line-chart';
import {LineChartExporter} from './line-chart-exporter';
import {PanZoomDragLayer} from './panZoomDragLayer';
// imports the style definition.
import './panZoomDragLayer.html';

const valueFormatter = multiscaleFormatter(Y_TOOLTIP_FORMATTER_PRECISION);

const formatValueOrNaN = (x) => (isNaN(x) ? 'NaN' : valueFormatter(x));

export const DEFAULT_TOOLTIP_COLUMNS = [
  {
    title: 'Name',
    evaluate: (d: Point) => d.dataset.metadata().name,
  },
  {
    title: 'Smoothed',
    evaluate(d: Point, statusObject: LineChartStatus) {
      const {smoothingEnabled} = statusObject;
      return formatValueOrNaN(
        smoothingEnabled ? d.datum.smoothed : d.datum.scalar
      );
    },
  },
  {
    title: 'Value',
    evaluate: (d: Point) => formatValueOrNaN(d.datum.scalar),
  },
  {
    title: 'Step',
    evaluate: (d: Point) => stepFormatter(d.datum.step),
  },
  {
    title: 'Time',
    evaluate: (d: Point) => timeFormatter(d.datum.wall_time),
  },
  {
    title: 'Relative',
    evaluate: (d: Point) =>
      relativeFormatter(relativeAccessor(d.datum, -1, d.dataset)),
  },
];

@customElement('vz-line-chart2')
class VzLineChart2<SeriesMetadata = {}> extends LegacyElementMixin(
  PolymerElement
) {
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
        contain: strict;
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

      #chartdiv {
        contain: strict;
      }

      #chartdiv line.guide-line {
        stroke: #999;
        stroke-width: 1.5px;
      }
      #chartdiv:hover .main {
        will-change: transform;
      }

      .ghost {
        opacity: 0.2;
        stroke-width: 1px;
      }

      .plottable .axis text {
        fill: currentColor;
      }

      .plottable .gridlines line {
        stroke: var(--tb-secondary-text-color);
      }
    </style>
  `;

  /**
   * Scale that maps series names to colors. The default colors are from
   * d3.schemeCategory10. Use this property to replace the default line
   * colors with colors of your own choice.
   */
  @property({type: Object})
  colorScale: Plottable.Scales.Color = new Plottable.Scales.Color().range(
    d3.schemeCategory10.slice(0)
  );

  /**
   * A function that takes a data series string and returns a
   * Plottable.SymbolFactory to use for rendering that series. This property
   * implements the vz_chart_helpers.SymbolFn interface.
   */
  @property({type: Object})
  symbolFunction: SymbolFn;

  /**
   * Whether smoothing is enabled or not. If true, smoothed lines will be
   * plotted in the chart while the unsmoothed lines will be ghosted in
   * the background.
   */
  @property({
    type: Boolean,
    notify: true,
  })
  smoothingEnabled: boolean = false;

  /**
   * Weight (between 0.0 and 1.0) of the smoothing. A value of 0.0
   * means very little smoothing, possibly no smoothing at all. A
   * value of 1.0 means a whole lot of smoothing, possibly so much as
   * to make the whole plot appear as a constant function.
   *
   * Has no effect when `smoothingEnabled` is `false`.
   */
  @property({type: Number})
  smoothingWeight: number = 0.6;

  /**
   * This is a helper field for automatically generating commonly used
   * functions for xComponentsCreationMethod. Valid values are what can
   * be processed by vz_chart_helpers.getXComponents() and include
   * "step", "wall_time", and "relative".
   */
  @property({type: String})
  xType: XType | null = null;

  /**
   * We accept a function for creating an XComponents object instead of such
   * an object itself because the Axis must be made right when we make the
   * LineChart object, lest we use a previously destroyed Axis. See the async
   * logic below that uses this property.
   *
   * Note that this function returns a function because polymer calls the
   * outer function to compute the value. We actually want the value of this
   * property to be the inner function.
   */
  @property({type: Object})
  xComponentsCreationMethod: (() => XComponents) | null = null;

  /**
   * A formatter for values along the X-axis. Optional. Defaults to a
   * reasonable formatter.
   */
  @property({type: Object})
  xAxisFormatter: (d: number) => string;

  /**
   * A method that implements the Plottable.IAccessor<number> interface. Used
   * for accessing the y value from a data point.
   *
   * Note that this function returns a function because polymer calls the
   * outer function to compute the value. We actually want the value of this
   * property to be the inner function.
   */
  @property({type: Object})
  yValueAccessor: (d: any) => string = (d) => d.scalar;

  /**
   * An array of ChartHelper.TooltipColumn objects. Used to populate the table
   * within the tooltip. The table contains 1 row per run.
   *
   * Note that this function returns a function because polymer calls the
   * outer function to compute the value. We actually want the value of this
   * property to be the inner function.
   */
  @property({type: Array})
  tooltipColumns: TooltipColumn[] = DEFAULT_TOOLTIP_COLUMNS;

  /**
   * An optional FillArea object. If provided, the chart will
   * visualize fill area alongside the primary line for each series. If set,
   * consider setting ignoreYOutliers to false. Otherwise, outlier
   * calculations may deem some margins to be outliers, and some portions of
   * the fill area may not display.
   */
  @property({type: Object})
  fillArea: FillArea;

  /**
   * An optional array of 2 numbers for the min and max of the default range
   * of the Y axis. If not provided, a reasonable range will be generated.
   * This property is a list instead of 2 individual properties to emphasize
   * that both the min and the max must be specified (or neither at all).
   */
  @property({type: Array})
  defaultXRange: unknown[];

  /**
   * An optional array of 2 numbers for the min and max of the default range
   * of the Y axis. If not provided, a reasonable range will be generated.
   * This property is a list instead of 2 individual properties to emphasize
   * that both the min and the max must be specified (or neither at all).
   */
  @property({type: Array})
  defaultYRange: unknown[];

  /**
   * The scale for the y-axis. Allows:
   * - "linear" - linear scale (Plottable.Scales.Linear)
   * - "log" - modified-log scale (Plottable.Scales.ModifiedLog)
   */
  @property({type: String})
  yScaleType: YScaleType = YScaleType.LINEAR;

  /**
   * Whether to ignore outlier data when computing the yScale domain.
   */
  @property({type: Boolean})
  ignoreYOutliers: boolean = false;

  /**
   * Change how the tooltip is sorted. Allows:
   * - "default" - Sort the tooltip by input order.
   * - "ascending" - Sort the tooltip by ascending value.
   * - "descending" - Sort the tooltip by descending value.
   * - "nearest" - Sort the tooltip by closest to cursor.
   */
  @property({type: String})
  tooltipSortingMethod: string = 'default';

  /**
   * Changes how the tooltip is positioned. Allows:
   * - "bottom" - Position the tooltip on the bottom of the chart.
   * - "right" - Position the tooltip to the right of the chart.
   * - "auto" - Position the tooltip to the bottom of the chart in most case.
   *            Position the tooltip above the chart if there isn't sufficient
   *            space below.
   */
  @property({type: String})
  tooltipPosition: TooltipPosition = TooltipPosition.BOTTOM;

  @property({type: Object})
  private _chart: any;

  @property({type: Array})
  private _visibleSeriesCache: string[] = [];

  @property({type: Object})
  private _seriesDataCache: object = {};

  @property({type: Object})
  private _seriesMetadataCache: Record<string, any> = {};

  @property({type: Number})
  private _makeChartAsyncCallbackId: number | null = null;

  ready() {
    super.ready();
    this.scopeSubtree(this.$.chartdiv, true);
  }

  private _listeners?: Set<any>;

  override attached() {
    // `capture` ensures that no handler can stop propagation and break the
    // handler. `passive` ensures that browser does not wait renderer thread
    // on JS handler (which can prevent default and impact rendering).
    const option = {capture: true, passive: true};
    this._listen(this, 'mousedown', this._onMouseDown.bind(this), option);
    this._listen(this, 'mouseup', this._onMouseUp.bind(this), option);
    this._listen(window, 'keydown', this._onKeyDown.bind(this), option);
    this._listen(window, 'keyup', this._onKeyUp.bind(this), option);
  }
  override detached() {
    if (this._makeChartAsyncCallbackId !== null) {
      this.cancelAsync(this._makeChartAsyncCallbackId);
      this._makeChartAsyncCallbackId = null;
    }
    if (this._chart) {
      this._chart.destroy();
      this._chart = undefined;
    }
    if (this._listeners) {
      this._listeners.forEach(({node, eventName, func, option}) => {
        node.removeEventListener(eventName, func, option);
      });
      this._listeners.clear();
    }
  }
  _listen(
    node: Node | Window,
    eventName: string,
    func: (event) => void,
    option = {}
  ) {
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add({node, eventName, func, option});
    node.addEventListener(eventName, func, option);
  }
  _onKeyDown(event) {
    this.toggleClass('pankey', PanZoomDragLayer.isPanKey(event));
  }
  _onKeyUp(event) {
    this.toggleClass('pankey', PanZoomDragLayer.isPanKey(event));
  }
  _onMouseDown(event) {
    this.toggleClass('mousedown', true);
  }
  _onMouseUp(event) {
    this.toggleClass('mousedown', false);
  }
  /**
   * Returns whether the extent of rendered data values fits the current
   * chart viewport domain (includes smoothing and outlier detection).
   *
   * This is true when there is no data, and false when the domain has been
   * transformed from the extent via transformations (pan, zoom).
   */
  isDataFitToDomain() {
    return this._chart ? this._chart.isDataFitToDomain() : true;
  }
  /**
   * Sets the series that the chart displays. Series with other names will
   * not be displayed.
   *
   * @param {Array<String>} names Array with the names of the series to
   * display.
   */
  setVisibleSeries(names) {
    if (_.isEqual(this._visibleSeriesCache, names)) return;
    this._visibleSeriesCache = names;
  }
  /**
   * Sets the data of one of the series. Note that to display this series
   * its name must be in the setVisibleSeries() array.
   *
   * @param {string} name Name of the series.
   * @param {Array<!vz_chart_helpers.ScalarDatum>} data Data of the series.
   * This is an array of objects with at least the following properties:
   * - step: (Number) - index of the datum.
   * - wall_time: (Date) - Date object with the datum's time.
   * - scalar: (Number) - Value of the datum.
   */
  setSeriesData(name, data) {
    this._seriesDataCache[name] = data;
    if (this._chart) {
      this._chart.setSeriesData(name, data);
    }
  }
  /**
   * Sets the metadata of one of the series.
   *
   * @param {string} name Name of the series.
   * @param {*} meta Metadata of the dataset used for later
   */
  setSeriesMetadata(name: string, meta: SeriesMetadata) {
    this._seriesMetadataCache[name] = meta;
    if (this._chart) {
      this._chart.setSeriesMetadata(name, meta);
    }
  }
  commitChanges() {
    if (!this._chart) return;
    this._chart.commitChanges();
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
  @observe(
    'xComponentsCreationMethod',
    'xType',
    'yValueAccessor',
    'yScaleType',
    'isAttached'
  )
  /**
   * Creates a chart, and asynchronously renders it. Fires a chart-rendered
   * event after the chart is rendered.
   */
  _makeChart() {
    if (this._makeChartAsyncCallbackId !== null) {
      this.cancelAsync(this._makeChartAsyncCallbackId);
      this._makeChartAsyncCallbackId = null;
    }
    this._makeChartAsyncCallbackId = this.async(function () {
      this._makeChartAsyncCallbackId = null;
      // Find the actual xComponentsCreationMethod.
      let normalXComponentsCreationMethod = this.xComponentsCreationMethod;
      if (!this.xType && !normalXComponentsCreationMethod) {
        normalXComponentsCreationMethod = stepX;
      } else if (this.xType) {
        normalXComponentsCreationMethod = () => getXComponents(this.xType);
      }
      if (
        !normalXComponentsCreationMethod ||
        !this.yValueAccessor ||
        !this.tooltipColumns
      ) {
        return;
      }
      // We directly reference properties of `this` because this call is
      // asynchronous, and values may have changed in between the call being
      // initiated and actually being run.
      var chart = new LineChart(
        normalXComponentsCreationMethod,
        this.yValueAccessor,
        this.yScaleType,
        this.colorScale,
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
      if (this._chart) {
        this._chart.destroy();
      }
      this._chart = chart;
      this._chart.onAnchor(() => this.fire('chart-attached'));
    }, 350);
  }
  @observe('_chart', '_visibleSeriesCache')
  _reloadFromCache() {
    if (!this._chart) return;
    this._visibleSeriesCache.forEach((name) => {
      this._chart.setSeriesData(name, this._seriesDataCache[name] || []);
    });
    this._visibleSeriesCache
      .filter((name) => this._seriesMetadataCache[name])
      .forEach((name: string) => {
        this._chart.setSeriesMetadata(name, this._seriesMetadataCache[name]);
      });
    this._chart.setVisibleSeries(this._visibleSeriesCache);
    this._chart.commitChanges();
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
  @observe('colorScale')
  _colorScaleChanged() {
    if (!this._chart) return;
    this._chart.setColorScale(this.colorScale);
    this._chart.redraw();
  }
  @observe('tooltipColumns')
  _tooltipColumnsChanged() {
    if (!this._chart) return;
    this._chart.setTooltipColumns(this.tooltipColumns);
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
class VzLineChartTooltip extends PolymerElement {
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
