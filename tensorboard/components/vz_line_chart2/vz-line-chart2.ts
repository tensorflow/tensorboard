/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
namespace vz_line_chart2 {

const valueFormatter = vz_chart_helpers.multiscaleFormatter(
    vz_chart_helpers.Y_TOOLTIP_FORMATTER_PRECISION);
const formatValueOrNaN = (x) => isNaN(x) ? 'NaN' : valueFormatter(x);

export const DEFAULT_TOOLTIP_COLUMNS = [
  {
    title: 'Name',
    evaluate: (d: vz_chart_helpers.Point) => d.dataset.metadata().name,
  },
  {
    title: 'Smoothed',
    evaluate(d: vz_chart_helpers.Point, statusObject: LineChartStatus) {
      const {smoothingEnabled} = statusObject;
      return formatValueOrNaN(
          smoothingEnabled ? d.datum.smoothed : d.datum.scalar);
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
            vz_chart_helpers.relativeAccessor(d.datum, -1, d.dataset)),
  },
];

Polymer({
  is: 'vz-line-chart2',
  properties: {
    /**
     * Scale that maps series names to colors. The default colors are from
     * d3.schemeCategory10. Use this property to replace the default line
     * colors with colors of your own choice.
     * @type {Plottable.Scales.Color}
     * @required
     */
    colorScale: {
      type: Object,
      value: function() {
        return new Plottable.Scales.Color().range(d3.schemeCategory10);
      }
    },

    /**
     * A function that takes a data series string and returns a
     * Plottable.SymbolFactory to use for rendering that series. This property
     * implements the vz_chart_helpers.SymbolFn interface.
     */
    symbolFunction: Object,

    /**
     * Whether smoothing is enabled or not. If true, smoothed lines will be
     * plotted in the chart while the unsmoothed lines will be ghosted in
     * the background.
     *
     * The smoothing algorithm is a simple moving average, which, given a
     * point p and a window w, replaces p with a simple average of the
     * points in the [p - floor(w/2), p + floor(w/2)] range.  If there
     * aren't enough points to cover the entire window to the left, the
     * window is reduced to fit exactly the amount of elements available.
     * This means that the smoothed line will be less in and gradually
     * become more smooth until the desired window is reached. However when
     * there aren't enough points on the right, the line stops being
     * rendered at all.
     */
    smoothingEnabled: {
      type: Boolean,
      notify: true,
      value: false,
    },

    /**
     * Weight (between 0.0 and 1.0) of the smoothing. This weight controls
     * the window size, and a weight of 1.0 means using 50% of the entire
     * dataset as the window, while a weight of 0.0 means using a window of
     * 0 (and thus replacing each point with themselves).
     *
     * The growth between 0.0 and 1.0 is not linear though. Because
     * changing the window from 0% to 30% of the dataset smooths the line a
     * lot more than changing the window from 70% to 100%, an exponential
     * function is used instead: http://i.imgur.com/bDrhEZU.png. This
     * function increases the size of the window slowly at the beginning
     * and gradually speeds up the growth, but 0.0 still means a window of
     * 0 and 1.0 still means a window of the dataset's length.
     */
    smoothingWeight: {type: Number, value: 0.6},

    /**
     * This is a helper field for automatically generating commonly used
     * functions for xComponentsCreationMethod. Valid values are what can
     * be processed by vz_chart_helpers.getXComponents() and include
     * "step", "wall_time", and "relative".
     */
    xType: {type: String, value: ''},

    /**
     * We accept a function for creating an XComponents object instead of such
     * an object itself because the Axis must be made right when we make the
     * LineChart object, lest we use a previously destroyed Axis. See the async
     * logic below that uses this property.
     *
     * Note that this function returns a function because polymer calls the
     * outer function to compute the value. We actually want the value of this
     * property to be the inner function.
     *
     * @type {function(): vz_chart_helpers.XComponents}
     */
    xComponentsCreationMethod: {
      type: Object,
      /* Note: We have to provide a nonsense value for
       * xComponentsCreationMethod here, because Polymer observers only
       * trigger after all parameters are set. */
      value: ''
    },

    /**
     * A formatter for values along the X-axis. Optional. Defaults to a
     * reasonable formatter.
     *
     * @type {function(number): string}
     */
    xAxisFormatter: Object,

    /**
     * A method that implements the Plottable.IAccessor<number> interface. Used
     * for accessing the y value from a data point.
     *
     * Note that this function returns a function because polymer calls the
     * outer function to compute the value. We actually want the value of this
     * property to be the inner function.
     */
    yValueAccessor: {type: Object, value: () => (d => d.scalar)},

    /**
     * An array of ChartHelper.TooltipColumn objects. Used to populate the table
     * within the tooltip. The table contains 1 row per run.
     *
     * Note that this function returns a function because polymer calls the
     * outer function to compute the value. We actually want the value of this
     * property to be the inner function.
     *
     */
    tooltipColumns: {
      type: Array,
      value: () => DEFAULT_TOOLTIP_COLUMNS,
    },

    /**
     * An optional FillArea object. If provided, the chart will
     * visualize fill area alongside the primary line for each series. If set,
     * consider setting ignoreYOutliers to false. Otherwise, outlier
     * calculations may deem some margins to be outliers, and some portions of
     * the fill area may not display.
     */
    fillArea: Object,

    /**
     * An optional array of 2 numbers for the min and max of the default range
     * of the Y axis. If not provided, a reasonable range will be generated.
     * This property is a list instead of 2 individual properties to emphasize
     * that both the min and the max must be specified (or neither at all).
     */
    defaultXRange: Array,

    /**
     * An optional array of 2 numbers for the min and max of the default range
     * of the Y axis. If not provided, a reasonable range will be generated.
     * This property is a list instead of 2 individual properties to emphasize
     * that both the min and the max must be specified (or neither at all).
     */
    defaultYRange: Array,

    /**
     * The scale for the y-axis. Allows:
     * - "linear" - linear scale (Plottable.Scales.Linear)
     * - "log" - modified-log scale (Plottable.Scales.ModifiedLog)
     */
    yScaleType: {type: String, value: 'linear'},

    /**
     * Whether to ignore outlier data when computing the yScale domain.
     */
    ignoreYOutliers: {
      type: Boolean,
      value: false,
    },

    /**
     * Change how the tooltip is sorted. Allows:
     * - "default" - Sort the tooltip by input order.
     * - "ascending" - Sort the tooltip by ascending value.
     * - "descending" - Sort the tooltip by descending value.
     * - "nearest" - Sort the tooltip by closest to cursor.
     */
    tooltipSortingMethod: {type: String, value: 'default'},

    /**
     * Changes how the tooltip is positioned. Allows:
     * - "bottom" - Position the tooltip on the bottom of the chart.
     * - "right" - Position the tooltip to the right of the chart.
     * - "auto" - Position the tooltip to the bottom of the chart in most case.
     *            Position the tooltip above the chart if there isn't sufficient
     *            space below.
     */
    tooltipPosition: {
      type: String,
      value: vz_chart_helper.TooltipPosition.BOTTOM,
    },

    _chart: Object,
    _visibleSeriesCache: {
      type: Array,
      value: () => [],
    },
    _seriesDataCache: {
      type: Object,
      value: () => ({}),
    },
    _seriesMetadataCache: {
      type: Object,
      value: () => ({}),
    },
    _makeChartAsyncCallbackId: {type: Number, value: null},
  },

  observers: [
    '_makeChart(xComponentsCreationMethod, xType, yValueAccessor, yScaleType, tooltipColumns, colorScale, isAttached)',
    '_reloadFromCache(_chart)',
    '_smoothingChanged(smoothingEnabled, smoothingWeight, _chart)',
    '_tooltipSortingMethodChanged(tooltipSortingMethod, _chart)',
    '_outliersChanged(ignoreYOutliers, _chart)',
  ],

  ready() {
    this.scopeSubtree(this.$.chartdiv, true);
  },

  attached() {
    // `capture` ensures that no handler can stop propagation and break the
    // handler. `passive` ensures that browser does not wait renderer thread
    // on JS handler (which can prevent default and impact rendering).
    const option = {capture: true, passive: true};
    this._listen(this, 'mousedown', this._onMouseDown.bind(this), option);
    this._listen(this, 'mouseup', this._onMouseUp.bind(this), option);
    this._listen(window, 'keydown', this._onKeyDown.bind(this), option);
    this._listen(window, 'keyup', this._onKeyUp.bind(this), option);
  },

  detached() {
    this.cancelAsync(this._makeChartAsyncCallbackId);
    if (this._chart) this._chart.destroy();
    if (this._listeners) {
      this._listeners.forEach(({node, eventName, func, option}) => {
        node.removeEventListener(eventName, func, option);
      });
      this._listeners.clear();
    }
  },

  _listen(node: Node, eventName: string, func: (event) => void, option = {}) {
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add({node, eventName, func, option});
    node.addEventListener(eventName, func, option);
  },

  _onKeyDown(event) {
    this.toggleClass('pankey', PanZoomDragLayer.isPanKey(event));
  },

  _onKeyUp(event) {
    this.toggleClass('pankey', PanZoomDragLayer.isPanKey(event));
  },

  _onMouseDown(event) {
    this.toggleClass('mousedown', true);
  },

  _onMouseUp(event) {
    this.toggleClass('mousedown', false);
  },

  /**
   * Sets the series that the chart displays. Series with other names will
   * not be displayed.
   *
   * @param {Array<String>} names Array with the names of the series to
   * display.
   */
  setVisibleSeries: function(names) {
    if (_.isEqual(this._visibleSeriesCache, names)) return;
    this._visibleSeriesCache = names;
    if (this._chart) {
      this._chart.setVisibleSeries(names);
      this.redraw();
    }
  },

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
  setSeriesData: function(name, data) {
    this._seriesDataCache[name] = data;
    if (this._chart) {
      this._chart.setSeriesData(name, data);
    }
  },

  /**
   * Sets the metadata of one of the series.
   *
   * @param {string} name Name of the series.
   * @param {*} meta Metadata of the dataset used for later
   */
  setSeriesMetadata(name: string, meta: any) {
    this._seriesMetadataCache[name] = meta;
    if (this._chart) {
      this._chart.setSeriesMetadata(name, meta);
    }
  },

  /**
   * Reset the chart domain. If the chart has not rendered yet, a call to this
   * method no-ops.
   */
  resetDomain: function() {
    if (this._chart) {
      this._chart.resetDomain();
    }
  },

  /**
   * Re-renders the chart. Useful if e.g. the container size changed.
   */
  redraw: function() {
    if (this._chart) {
      this._chart.redraw();
    }
  },

  /**
   * Creates a chart, and asynchronously renders it. Fires a chart-rendered
   * event after the chart is rendered.
   */
  _makeChart: function(
      xComponentsCreationMethod,
      xType,
      yValueAccessor,
      yScaleType,
      tooltipColumns,
      colorScale) {
    // Find the actual xComponentsCreationMethod.
    if (!xType && !xComponentsCreationMethod) {
      xComponentsCreationMethod = vz_chart_helpers.stepX;
    } else if (xType) {
      xComponentsCreationMethod = () =>
          vz_chart_helpers.getXComponents(xType);
    }

    if (this._makeChartAsyncCallbackId !== null) {
      this.cancelAsync(this._makeChartAsyncCallbackId);
      this._makeChartAsyncCallbackId = null;
    }

    this._makeChartAsyncCallbackId = this.async(function() {
      this._makeChartAsyncCallbackId = null;
      if (!xComponentsCreationMethod ||
          !this.yValueAccessor ||
          !this.tooltipColumns) {
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
          this.xAxisFormatter);
      var div = d3.select(this.$.chartdiv);
      chart.renderTo(div);
      if (this._chart) this._chart.destroy();
      this._chart = chart;
      this._chart.onAnchor(() => this.fire('chart-attached'));
    }, 350);
  },

  _reloadFromCache: function() {
    if (!this._chart) return;
    this._visibleSeriesCache.forEach(name => {
      this._chart.setSeriesData(name, this._seriesDataCache[name] || []);
    });
    this._visibleSeriesCache
        .filter(name => this._seriesMetadataCache[name])
        .forEach(name => {
          this._chart.setSeriesMetadata(name, this._seriesMetadataCache[name]);
        });
    this._chart.setVisibleSeries(this._visibleSeriesCache);
  },

  _smoothingChanged: function() {
    if (!this._chart) return;
    if (this.smoothingEnabled) {
      this._chart.smoothingUpdate(this.smoothingWeight);
    } else {
      this._chart.smoothingDisable();
    }
  },

  _outliersChanged: function() {
    if (!this._chart) return;
    this._chart.ignoreYOutliers(this.ignoreYOutliers);
  },

  _tooltipSortingMethodChanged: function() {
    if (!this._chart) return;
    this._chart.setTooltipSortingMethod(this.tooltipSortingMethod);
  },

  getExporter() {
    return new LineChartExporter(this.$.chartdiv);
  },

});

}  // namespace vz_line_chart2
