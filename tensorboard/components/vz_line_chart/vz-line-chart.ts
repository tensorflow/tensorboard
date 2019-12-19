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
import {customElement, property, observe, computed} from '@polymer/decorators';
import * as d3 from 'd3';
import * as Plottable from 'plottable';
import * as _ from 'lodash';
import * as vz_chart_helpers from '../vz_chart_helpers/vz-chart-helpers';
import {TooltipPosition} from '../vz_chart_helpers/vz-chart-tooltip';
import {DragZoomLayer} from './dragZoomInteraction';

/**
 * An interface that describes a fill area to visualize. The fill area is
 * visualized with a less intense version of the color for a given series.
 */
export interface FillArea {
  // The lower end of the fill area.
  lowerAccessor: Plottable.IAccessor<number>;
  // The higher end of the fill area.
  higherAccessor: Plottable.IAccessor<number>;
}

const valueFormatter = vz_chart_helpers.multiscaleFormatter(
  vz_chart_helpers.Y_TOOLTIP_FORMATTER_PRECISION
);

const formatValueOrNaN = (x: number) => (isNaN(x) ? 'NaN' : valueFormatter(x));

type NumberFormatter = (num: number) => string;

enum TooltipSortingMethod {
  DEFAULT = 'default',
  ASCENDING = 'ascending',
  DESCENDNG = 'descending',
  NEAREST = 'nearest',
}

/**
 * The maximum number of marker symbols within any line for a data series. Too
 * many markers clutter the chart.
 */
const _MAX_MARKERS = 20;
@customElement('vz-line-chart')
class VzLineChart extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div id="tooltip">
      <table>
        <thead>
          <!-- We inject the HTML instead of using dom-repeat because polymer
               does not support dom-repeat templates within table elements. -->
          <tr
            id="tooltip-table-header-row"
            inner-h-t-m-l="[[_tooltipTableHeaderHtml]]"
          ></tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <div id="chartdiv"></div>
    <style>
      :host {
        -webkit-user-select: none;
        -moz-user-select: none;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        flex-shrink: 1;
        position: relative;
        outline: none;
      }
      div {
        -webkit-user-select: none;
        -moz-user-select: none;
        flex-grow: 1;
        flex-shrink: 1;
      }
      td {
        padding-left: 5px;
        padding-right: 5px;
        font-size: 13px;
        opacity: 1;
      }
      #tooltip {
        pointer-events: none;
        position: absolute;
        opacity: 0;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        font-size: 14px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 4px;
        line-height: 1.4em;
        padding: 8px;
        z-index: 5;
        cursor: none;
        margin-top: 10px;
      }
      .swatch {
        border-radius: 50%;
        width: 14px;
        height: 14px;
        display: block;
        border: 2px solid rgba(0, 0, 0, 0);
      }
      .closest .swatch {
        border: 2px solid white;
      }
      th {
        padding-left: 5px;
        padding-right: 5px;
        text-align: left;
      }
      .distant td {
        opacity: 0.8;
      }

      .distant td.swatch {
        opacity: 1;
      }

      .ghost {
        opacity: 0.2;
        stroke-width: 1px;
      }

      #chartdiv line.guide-line {
        stroke: #999;
        stroke-width: 1.5px;
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
  yAxisFormatter?: NumberFormatter;

  @property({type: Object})
  yValueAccessor: Plottable.IAccessor<number> = (d) => d.scalar;

  @property({
    type: Array,
  })
  tooltipColumns: vz_chart_helpers.TooltipColumn[] = [
    {
      title: 'Name',
      evaluate: (d) => d.dataset.metadata().name,
    },
    {
      title: 'Smoothed',
      evaluate: (d, statusObject) => {
        const smoothingEnabled = statusObject && statusObject.smoothingEnabled;
        return formatValueOrNaN(
          smoothingEnabled ? d.datum.smoothed : d.datum.scalar
        );
      },
    },
    {
      title: 'Value',
      evaluate: (d) => formatValueOrNaN(d.datum.scalar),
    },
    {
      title: 'Step',
      evaluate: (d) => vz_chart_helpers.stepFormatter(d.datum.step),
    },
    {
      title: 'Time',
      evaluate: (d) => vz_chart_helpers.timeFormatter(d.datum.wall_time),
    },
    {
      title: 'Relative',
      evaluate: (d) =>
        vz_chart_helpers.relativeFormatter(
          vz_chart_helpers.relativeAccessor(d.datum, -1, d.dataset)
        ),
    },
  ];

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

  @property({
    type: Array,
  })
  seriesWithoutTooltips: string[] = [];

  @property({type: Boolean})
  _attached: boolean = false;

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

  /**
   * Sets the series that the chart displays. Series with other names will
   * not be displayed.
   */
  setVisibleSeries(names: string[]) {
    this._visibleSeriesCache = names;
    if (this._chart) {
      this._chart.setVisibleSeries(names);
      this.redraw();
    }
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
  attached() {
    this._attached = true;
  }
  detached() {
    if (this._chart) this._chart.destroy();
    this._attached = false;
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
    'seriesWithoutTooltips',
    '_attached'
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
    this._makeChartAsyncCallbackId = this.async(() => {
      this._makeChartAsyncCallbackId = null;
      if (
        !this._attached ||
        !xComponentsCreationMethod ||
        !this.yValueAccessor ||
        !this.tooltipColumns
      ) {
        return;
      }
      var tooltip = d3.select(this.$.tooltip);
      // We directly reference properties of `this` because this call is
      // asynchronous, and values may have changed in between the call being
      // initiated and actually being run.
      var chart = new LineChart(
        xComponentsCreationMethod,
        this.yValueAccessor,
        yScaleType,
        colorScale,
        tooltip,
        this.tooltipColumns,
        this.fillArea,
        this.defaultXRange,
        this.defaultYRange,
        this.symbolFunction,
        this.xAxisFormatter,
        this.yAxisFormatter,
        this.seriesWithoutTooltips
      );
      var div = d3.select(this.$.chartdiv);
      chart.renderTo(div);
      if (this._chart) this._chart.destroy();
      this._chart = chart;
    }, 350);
  }

  @observe('_chart')
  _reloadFromCache() {
    if (this._chart) {
      this._chart.setVisibleSeries(this._visibleSeriesCache);
      this._visibleSeriesCache.forEach((name) => {
        this._chart!.setSeriesData(name, this._seriesDataCache[name] || []);
      });
    }
  }

  @observe('smoothingEnabled', 'smoothingWeight', '_chart')
  _smoothingChanged() {
    if (!this._chart) {
      return;
    }
    if (this.smoothingEnabled) {
      this._chart.smoothingUpdate(this.smoothingWeight);
    } else {
      this._chart.smoothingDisable();
    }
  }

  @observe('ignoreYOutliers', '_chart')
  _outliersChanged() {
    if (!this._chart) {
      return;
    }
    this._chart.ignoreYOutliers(this.ignoreYOutliers);
  }

  @observe('tooltipSortingMethod', '_chart')
  _tooltipSortingMethodChanged() {
    if (this._chart) {
      this._chart.setTooltipSortingMethod(this.tooltipSortingMethod);
    }
  }

  @observe('tooltipPosition', '_chart')
  _tooltipPositionChanged() {
    if (this._chart) {
      this._chart.setTooltipPosition(this.tooltipPosition);
    }
  }

  @computed('tooltipColumns')
  get _tooltipTableHeaderHtml() {
    // The first column contains the circle with the color of the run.
    const titles = ['', ..._.map(this.tooltipColumns, 'title')];
    return titles.map((title) => `<th>${this._sanitize(title)}</th>`).join('');
  }

  _sanitize(value: string) {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;') // for symmetry :-)
      .replace(/&/g, '&amp;');
  }
}

class LineChart {
  private name2datasets: {
    [name: string]: Plottable.Dataset;
  } = {};
  private seriesNames: string[] = [];
  private xAccessor: Plottable.IAccessor<number | Date>;
  private xScale: Plottable.QuantitativeScale<number | Date>;
  private yScale: Plottable.QuantitativeScale<number>;
  private gridlines: Plottable.Components.Gridlines;
  private center: Plottable.Components.Group;
  private xAxis: Plottable.Axes.Numeric | Plottable.Axes.Time;
  private yAxis: Plottable.Axes.Numeric;
  private outer: Plottable.Components.Table;
  private colorScale: Plottable.Scales.Color;
  private symbolFunction?: vz_chart_helpers.SymbolFn;
  private tooltipColumns: vz_chart_helpers.TooltipColumn[];
  private tooltip: d3.Selection<any, any, any, any>;
  private tooltipInteraction: Plottable.Interactions.Pointer;
  private tooltipPointsComponent: Plottable.Component;
  private dzl: DragZoomLayer;
  private linePlot?: Plottable.Plots.Line<number | Date>;
  private smoothLinePlot?: Plottable.Plots.Line<number | Date>;
  private marginAreaPlot?: Plottable.Plots.Area<number | Date>;
  private scatterPlot?: Plottable.Plots.Scatter<number | Date, Number>;
  private markersScatterPlot?: Plottable.Plots.Scatter<number | Date, number>;
  private yValueAccessor: Plottable.IAccessor<number>;
  private smoothedAccessor: Plottable.IAccessor<number> = (
    d: vz_chart_helpers.ScalarDatum
  ) => d.smoothed;
  private lastPointsDataset: Plottable.Dataset = new Plottable.Dataset();
  private fillArea?: FillArea;
  private datasets: Plottable.Dataset[] = [];
  private onDatasetChanged: (dataset: Plottable.Dataset) => void;
  private nanDataset: Plottable.Dataset = new Plottable.Dataset();
  private smoothingWeight: number = 0;
  private smoothingEnabled: boolean = false;
  private tooltipSortingMethod: TooltipSortingMethod =
    TooltipSortingMethod.DEFAULT;
  private tooltipPosition?: TooltipPosition;
  private seriesWithoutTooltips?: string[];
  private _ignoreYOutliers: boolean = false;
  // An optional list of 2 numbers.
  private _defaultXRange?: number[];
  // An optional list of 2 numbers.
  private _defaultYRange?: number[];

  constructor(
    xComponentsCreationMethod: () => vz_chart_helpers.XComponents,
    yValueAccessor: Plottable.IAccessor<number>,
    yScaleType: string,
    colorScale: Plottable.Scales.Color,
    tooltip: d3.Selection<any, any, any, any>,
    tooltipColumns: vz_chart_helpers.TooltipColumn[],
    fillArea?: FillArea,
    defaultXRange?: number[],
    defaultYRange?: number[],
    symbolFunction?: vz_chart_helpers.SymbolFn,
    xAxisFormatter?: NumberFormatter,
    yAxisFormatter?: NumberFormatter,
    seriesWithoutTooltips?: string[]
  ) {
    this.colorScale = colorScale;
    this.tooltip = tooltip;
    this.yValueAccessor = yValueAccessor;
    // The symbol function maps series to marker. It uses a special dataset that
    // varies based on whether smoothing is enabled.
    this.symbolFunction = symbolFunction;
    // need to do a single bind, so we can deregister the callback from
    // old Plottable.Datasets. (Deregistration is done by identity checks.)
    this.onDatasetChanged = this._onDatasetChanged.bind(this);
    this._defaultXRange = defaultXRange;
    this._defaultYRange = defaultYRange;
    this.tooltipColumns = tooltipColumns;
    this.seriesWithoutTooltips = seriesWithoutTooltips;

    const xComponents = xComponentsCreationMethod();
    this.xAccessor = xComponents.accessor;
    this.xScale = xComponents.scale;
    this.xAxis = xComponents.axis;
    const xAxisMargin = this.xAxis.margin(0);
    if (typeof xAxisMargin !== 'number') {
      xAxisMargin.tickLabelPadding(3);
    }
    if (xAxisFormatter) {
      this.xAxis.formatter(xAxisFormatter);
    }
    this.yScale = LineChart.getYScaleFromType(yScaleType);
    this.yAxis = new Plottable.Axes.Numeric(this.yScale, 'left');
    this.yAxis.margin(0).tickLabelPadding(5);
    this.yAxis.formatter(
      yAxisFormatter
        ? yAxisFormatter
        : vz_chart_helpers.multiscaleFormatter(
            vz_chart_helpers.Y_AXIS_FORMATTER_PRECISION
          )
    );
    this.yAxis.usesTextWidthApproximation(true);
    this.fillArea = fillArea;
    this.dzl = new DragZoomLayer(
      this.xScale,
      this.yScale,
      this.resetYDomain.bind(this)
    );
    this.tooltipInteraction = this.createTooltipInteraction(this.dzl);
    this.tooltipPointsComponent = new Plottable.Component();
    const plot = this.buildPlot(this.xScale, this.yScale, fillArea);
    this.gridlines = new Plottable.Components.Gridlines(
      this.xScale,
      this.yScale
    );
    let xZeroLine = new Plottable.Components.GuideLineLayer('horizontal');
    xZeroLine.scale(this.yScale).value(0);
    let yZeroLine = new Plottable.Components.GuideLineLayer('vertical');
    yZeroLine.scale(this.xScale).value(0);
    this.center = new Plottable.Components.Group([
      this.gridlines,
      xZeroLine,
      yZeroLine,
      plot,
      this.dzl,
      this.tooltipPointsComponent,
    ]);
    this.outer = new Plottable.Components.Table([
      [this.yAxis, this.center],
      [null, this.xAxis],
    ]);
  }

  private buildPlot(
    xScale: Plottable.QuantitativeScale<number | Date>,
    yScale: Plottable.QuantitativeScale<number>,
    fillArea?: FillArea
  ): Plottable.Component {
    if (fillArea) {
      this.marginAreaPlot = new Plottable.Plots.Area<number | Date>();
      this.marginAreaPlot.x(this.xAccessor, xScale);
      this.marginAreaPlot.y(fillArea.higherAccessor, yScale);
      this.marginAreaPlot.y0(fillArea.lowerAccessor);
      this.marginAreaPlot.attr(
        'fill',
        (d: vz_chart_helpers.Datum, i: number, dataset: Plottable.Dataset) =>
          this.colorScale.scale(dataset.metadata().name)
      );
      this.marginAreaPlot.attr('fill-opacity', 0.3);
      this.marginAreaPlot.attr('stroke-width', 0);
    }

    let linePlot = new Plottable.Plots.Line<number | Date>();
    linePlot.x(this.xAccessor, xScale);
    linePlot.y(this.yValueAccessor, yScale);
    linePlot.attr(
      'stroke',
      (d: vz_chart_helpers.Datum, i: number, dataset: Plottable.Dataset) =>
        this.colorScale.scale(dataset.metadata().name)
    );
    this.linePlot = linePlot;
    this.setupTooltips(linePlot);
    let smoothLinePlot = new Plottable.Plots.Line<number | Date>();
    smoothLinePlot.x(this.xAccessor, xScale);
    smoothLinePlot.y(this.smoothedAccessor, yScale);
    smoothLinePlot.attr(
      'stroke',
      (d: vz_chart_helpers.Datum, i: number, dataset: Plottable.Dataset) =>
        this.colorScale.scale(dataset.metadata().name)
    );
    this.smoothLinePlot = smoothLinePlot;
    if (this.symbolFunction) {
      const markersScatterPlot = new Plottable.Plots.Scatter<
        number | Date,
        number
      >();
      markersScatterPlot.x(this.xAccessor, xScale);
      markersScatterPlot.y(this.yValueAccessor, yScale);
      markersScatterPlot.attr(
        'fill',
        (d: vz_chart_helpers.Datum, i: number, dataset: Plottable.Dataset) =>
          this.colorScale.scale(dataset.metadata().name)
      );
      markersScatterPlot.attr('opacity', 1);
      markersScatterPlot.size(vz_chart_helpers.TOOLTIP_CIRCLE_SIZE * 2);
      markersScatterPlot.symbol(
        (d: vz_chart_helpers.Datum, i: number, dataset: Plottable.Dataset) => {
          return this.symbolFunction!(dataset.metadata().name);
        }
      );
      // Use a special dataset because this scatter plot should use the accesor
      // that depends on whether smoothing is enabled.
      this.markersScatterPlot = markersScatterPlot;
    }
    // The scatterPlot will display the last point for each dataset.
    // This way, if there is only one datum for the series, it is still
    // visible. We hide it when tooltips are active to keep things clean.
    let scatterPlot = new Plottable.Plots.Scatter<number | Date, number>();
    scatterPlot.x(this.xAccessor, xScale);
    scatterPlot.y(this.yValueAccessor, yScale);
    scatterPlot.attr('fill', (d: any) => this.colorScale.scale(d.name));
    scatterPlot.attr('opacity', 1);
    scatterPlot.size(vz_chart_helpers.TOOLTIP_CIRCLE_SIZE * 2);
    scatterPlot.datasets([this.lastPointsDataset]);
    this.scatterPlot = scatterPlot;
    let nanDisplay = new Plottable.Plots.Scatter<number | Date, number>();
    nanDisplay.x(this.xAccessor, xScale);
    nanDisplay.y((x) => x.displayY, yScale);
    nanDisplay.attr('fill', (d: any) => this.colorScale.scale(d.name));
    nanDisplay.attr('opacity', 1);
    nanDisplay.size(vz_chart_helpers.NAN_SYMBOL_SIZE * 2);
    nanDisplay.datasets([this.nanDataset]);
    nanDisplay.symbol(Plottable.SymbolFactories.triangle);
    const groups = [nanDisplay, scatterPlot, smoothLinePlot, linePlot];
    if (this.marginAreaPlot) {
      groups.push(this.marginAreaPlot);
    }
    if (this.markersScatterPlot) {
      groups.push(this.markersScatterPlot);
    }
    return new Plottable.Components.Group(groups);
  }
  /** Updates the chart when a dataset changes. Called every time the data of
   * a dataset changes to update the charts.
   */
  private _onDatasetChanged(dataset: Plottable.Dataset) {
    if (this.smoothingEnabled) {
      this.resmoothDataset(dataset);
    }
    this.updateSpecialDatasets();
  }
  public ignoreYOutliers(ignoreYOutliers: boolean) {
    if (ignoreYOutliers !== this._ignoreYOutliers) {
      this._ignoreYOutliers = ignoreYOutliers;
      this.updateSpecialDatasets();
      this.resetYDomain();
    }
  }
  /** Constructs special datasets. Each special dataset contains exceptional
   * values from all of the regular datasets, e.g. last points in series, or
   * NaN values. Those points will have a `name` and `relative` property added
   * (since usually those are context in the surrounding dataset).
   */
  private updateSpecialDatasets() {
    const accessor = this.getYAxisAccessor();
    let lastPointsData = this.datasets
      .map((d) => {
        let datum = null;
        // filter out NaNs to ensure last point is a clean one
        let nonNanData = d.data().filter((x) => !isNaN(accessor(x, -1, d)));
        if (nonNanData.length > 0) {
          let idx = nonNanData.length - 1;
          datum = nonNanData[idx];
          datum.name = d.metadata().name;
          datum.relative = vz_chart_helpers.relativeAccessor(datum, -1, d);
        }
        return datum;
      })
      .filter((x) => x != null);
    this.lastPointsDataset.data(lastPointsData);
    if (this.markersScatterPlot) {
      this.markersScatterPlot.datasets(
        this.datasets.map(this.createSampledDatasetForMarkers)
      );
    }
    // Take a dataset, return an array of NaN data points
    // the NaN points will have a "displayY" property which is the
    // y-value of a nearby point that was not NaN (0 if all points are NaN)
    let datasetToNaNData = (d: Plottable.Dataset) => {
      let displayY = null;
      let data = d.data();
      let i = 0;
      while (i < data.length && displayY == null) {
        if (!isNaN(accessor(data[i], -1, d))) {
          displayY = accessor(data[i], -1, d);
        }
        i++;
      }
      if (displayY == null) {
        displayY = 0;
      }
      let nanData = [];
      for (i = 0; i < data.length; i++) {
        if (!isNaN(accessor(data[i], -1, d))) {
          displayY = accessor(data[i], -1, d);
        } else {
          data[i].name = d.metadata().name;
          data[i].displayY = displayY;
          data[i].relative = vz_chart_helpers.relativeAccessor(data[i], -1, d);
          nanData.push(data[i]);
        }
      }
      return nanData;
    };
    let nanData = _.flatten(this.datasets.map(datasetToNaNData));
    this.nanDataset.data(nanData);
  }
  public resetDomain() {
    this.resetXDomain();
    this.resetYDomain();
  }
  private resetXDomain() {
    let xDomain;
    if (this._defaultXRange != null) {
      // Use the range specified by the caller.
      xDomain = this._defaultXRange;
    } else {
      // (Copied from DragZoomLayer.unzoom.)
      const xScale = this.xScale as any;
      xScale._domainMin = null;
      xScale._domainMax = null;
      xDomain = xScale._getExtent();
    }
    this.xScale.domain(xDomain);
  }
  private resetYDomain() {
    let yDomain;
    if (this._defaultYRange != null) {
      // Use the range specified by the caller.
      yDomain = this._defaultYRange;
    } else {
      // Generate a reasonable range.
      const accessors = this.getAccessorsForComputingYRange();
      let datasetToValues: (d: Plottable.Dataset) => number[][] = (d) => {
        return accessors.map((accessor) =>
          d.data().map((x) => accessor(x, -1, d))
        );
      };
      const vals = _.flattenDeep<number>(
        this.datasets.map(datasetToValues)
      ).filter(isFinite);
      yDomain = vz_chart_helpers.computeDomain(vals, this._ignoreYOutliers);
    }
    this.yScale.domain(yDomain);
  }
  private getAccessorsForComputingYRange(): Plottable.IAccessor<number>[] {
    const accessors = [this.getYAxisAccessor()];
    if (this.fillArea) {
      // Make the Y domain take margins into account.
      accessors.push(this.fillArea.lowerAccessor, this.fillArea.higherAccessor);
    }
    return accessors;
  }
  private getYAxisAccessor() {
    return this.smoothingEnabled ? this.smoothedAccessor : this.yValueAccessor;
  }
  private createTooltipInteraction(
    dzl: DragZoomLayer
  ): Plottable.Interactions.Pointer {
    const pi = new Plottable.Interactions.Pointer();
    // Disable interaction while drag zooming.
    dzl.interactionStart(() => {
      pi.enabled(false);
      this.hideTooltips();
    });
    dzl.interactionEnd(() => pi.enabled(true));
    pi.onPointerMove((p: Plottable.Point) => {
      // Line plot must be initialized to draw.
      if (!this.linePlot) return;
      let target = {
        x: p.x,
        y: p.y,
      };
      let bbox: SVGRect = (<any>this.gridlines.content().node()).getBBox();
      // pts is the closets point to the tooltip for each dataset
      let pts = this.linePlot
        .datasets()
        .map((dataset) => this.findClosestPoint(target, dataset))
        .filter(Boolean);
      let intersectsBBox = Plottable.Utils.DOM.intersectsBBox;
      // We draw tooltips for points that are not explicity ignored,
      // and are NaN or are currently visible.
      let ptsForTooltips = pts.filter(
        (p) =>
          (intersectsBBox(p.x, p.y, bbox) ||
            isNaN(this.yValueAccessor(p.datum, 0, p.dataset))) &&
          (!this.seriesWithoutTooltips ||
            this.seriesWithoutTooltips.indexOf(p.dataset.metadata().name) == -1)
      );
      // Only draw little indicator circles for the non-NaN points
      let ptsToCircle = ptsForTooltips.filter(
        (p) => !isNaN(this.yValueAccessor(p.datum, 0, p.dataset))
      );
      let ptsSelection: any = this.tooltipPointsComponent
        .content()
        .selectAll('.point')
        .data(
          ptsToCircle,
          (p: vz_chart_helpers.Point) => p.dataset.metadata().name
        );
      if (pts.length !== 0) {
        ptsSelection
          .enter()
          .append('circle')
          .classed('point', true);
        ptsSelection
          .attr('r', vz_chart_helpers.TOOLTIP_CIRCLE_SIZE)
          .attr('cx', (p: vz_chart_helpers.Point) => p.x)
          .attr('cy', (p: vz_chart_helpers.Point) => p.y)
          .style('stroke', 'none')
          .attr('fill', (p: vz_chart_helpers.Point) =>
            this.colorScale.scale(p.dataset.metadata().name)
          );
        ptsSelection.exit().remove();
        this.drawTooltips(ptsForTooltips, target, this.tooltipColumns);
      } else {
        this.hideTooltips();
      }
    });
    pi.onPointerExit(() => this.hideTooltips());
    return pi;
  }
  private hideTooltips(): void {
    this.tooltip.style('opacity', 0);
    if (this.scatterPlot) this.scatterPlot.attr('opacity', 1);
    this.tooltipPointsComponent
      .content()
      .selectAll('.point')
      .remove();
  }
  private setupTooltips(plot: Plottable.XYPlot<number | Date, number>): void {
    plot.onDetach(() => {
      this.tooltipInteraction.detachFrom(plot);
      this.tooltipInteraction.enabled(false);
    });
    plot.onAnchor(() => {
      this.tooltipInteraction.attachTo(plot);
      this.tooltipInteraction.enabled(true);
    });
  }
  private drawTooltips(
    points: vz_chart_helpers.Point[],
    target: {x: number; y: number},
    tooltipColumns: vz_chart_helpers.TooltipColumn[]
  ) {
    // Formatters for value, step, and wall_time
    if (this.scatterPlot) this.scatterPlot.attr('opacity', 0);
    let dist = (p: vz_chart_helpers.Point) =>
      Math.pow(p.x - target.x, 2) + Math.pow(p.y - target.y, 2);
    let closestDist = _.min(points.map(dist));
    let valueSortMethod = this.yValueAccessor;
    if (this.smoothingEnabled) {
      valueSortMethod = this.smoothedAccessor;
    }
    if (this.tooltipSortingMethod === TooltipSortingMethod.ASCENDING) {
      points = _.sortBy(points, (d) => valueSortMethod(d.datum, -1, d.dataset));
    } else if (this.tooltipSortingMethod === TooltipSortingMethod.DESCENDNG) {
      points = _.sortBy(points, (d) =>
        valueSortMethod(d.datum, -1, d.dataset)
      ).reverse();
    } else if (this.tooltipSortingMethod === TooltipSortingMethod.NEAREST) {
      points = _.sortBy(points, dist);
    } else {
      // The 'default' sorting method maintains the order of names passed to
      // setVisibleSeries(). However we reverse that order when defining the
      // datasets. So we must call reverse again to restore the order.
      points = points.slice(0).reverse();
    }
    let rows = this.tooltip
      .select('tbody')
      .html('')
      .selectAll('tr')
      .data(points)
      .enter()
      .append('tr');
    // Grey out the point if any of the following are true:
    // - The cursor is outside of the x-extent of the dataset
    // - The point's y value is NaN
    rows.classed('distant', (d) => {
      let firstPoint = d.dataset.data()[0];
      let lastPoint = _.last(d.dataset.data());
      let firstX = this.xScale.scale(this.xAccessor(firstPoint, 0, d.dataset));
      let lastX = this.xScale.scale(this.xAccessor(lastPoint, 0, d.dataset));
      let s = this.smoothingEnabled
        ? d.datum.smoothed
        : this.yValueAccessor(d.datum, 0, d.dataset);
      return target.x < firstX || target.x > lastX || isNaN(s);
    });
    rows.classed('closest', (p) => dist(p) === closestDist);
    // It is a bit hacky that we are manually applying the width to the swatch
    // and the nowrap property to the text here. The reason is as follows:
    // the style gets updated asynchronously by Polymer scopeSubtree observer.
    // Which means we would get incorrect sizing information since the text
    // would wrap by default. However, we need correct measurements so that
    // we can stop the text from falling off the edge of the screen.
    // therefore, we apply the size-critical styles directly.
    rows.style('white-space', 'nowrap');
    rows
      .append('td')
      .append('span')
      .classed('swatch', true)
      .style('background-color', (d) =>
        this.colorScale.scale(d.dataset.metadata().name)
      );
    _.each(tooltipColumns, (column) => {
      rows.append('td').text((d) =>
        column.evaluate(d, {
          smoothingEnabled: this.smoothingEnabled,
        })
      );
    });
    // compute left position
    let documentWidth = document.body.clientWidth;
    let node: any = this.tooltip.node();
    let parentRect = node.parentElement.getBoundingClientRect();
    let nodeRect = node.getBoundingClientRect();
    // prevent it from falling off the right side of the screen
    let left = documentWidth - parentRect.left - nodeRect.width - 60,
      top = 0;
    if (this.tooltipPosition === TooltipPosition.RIGHT) {
      left = Math.min(parentRect.width, left);
    } else {
      // 'bottom'
      left = Math.min(0, left);
      top = parentRect.height + vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;
    }
    this.tooltip.style('transform', 'translate(' + left + 'px,' + top + 'px)');
    this.tooltip.style('opacity', 1);
  }
  private findClosestPoint(
    target: {x: number; y: number},
    dataset: Plottable.Dataset
  ): vz_chart_helpers.Point {
    let points: vz_chart_helpers.Point[] = dataset.data().map((d, i) => {
      let x = this.xAccessor(d, i, dataset);
      let y = this.smoothingEnabled
        ? this.smoothedAccessor(d, i, dataset)
        : this.yValueAccessor(d, i, dataset);
      return {
        x: this.xScale.scale(x),
        y: this.yScale.scale(y),
        datum: d,
        dataset: dataset,
      };
    });
    let idx: number = _.sortedIndexBy(
      points,
      target,
      (p: vz_chart_helpers.Point) => p.x
    );
    if (idx === points.length) {
      return points[points.length - 1];
    } else if (idx === 0) {
      return points[0];
    } else {
      let prev = points[idx - 1];
      let next = points[idx];
      let prevDist = Math.abs(prev.x - target.x);
      let nextDist = Math.abs(next.x - target.x);
      return prevDist < nextDist ? prev : next;
    }
  }
  private resmoothDataset(dataset: Plottable.Dataset) {
    let data = dataset.data();
    const smoothingWeight = this.smoothingWeight;
    // 1st-order IIR low-pass filter to attenuate the higher-
    // frequency components of the time-series.
    let last = data.length > 0 ? 0 : NaN;
    let numAccum = 0;
    const yValues = data.map((d, i) => this.yValueAccessor(d, i, dataset));
    // See #786.
    const isConstant = yValues.every((v) => v == yValues[0]);
    data.forEach((d, i) => {
      const nextVal = yValues[i];
      if (isConstant || !Number.isFinite(nextVal)) {
        d.smoothed = nextVal;
      } else {
        last = last * smoothingWeight + (1 - smoothingWeight) * nextVal;
        numAccum++;
        // The uncorrected moving average is biased towards the initial value.
        // For example, if initialized with `0`, with smoothingWeight `s`, where
        // every data point is `c`, after `t` steps the moving average is
        // ```
        //   EMA = 0*s^(t) + c*(1 - s)*s^(t-1) + c*(1 - s)*s^(t-2) + ...
        //       = c*(1 - s^t)
        // ```
        // If initialized with `0`, dividing by (1 - s^t) is enough to debias
        // the moving average. We count the number of finite data points and
        // divide appropriately before storing the data.
        let debiasWeight = 1;
        if (smoothingWeight !== 1) {
          debiasWeight = 1 - Math.pow(smoothingWeight, numAccum);
        }
        d.smoothed = last / debiasWeight;
      }
    });
  }
  private getDataset(name: string) {
    if (this.name2datasets[name] === undefined) {
      this.name2datasets[name] = new Plottable.Dataset([], {name: name});
    }
    return this.name2datasets[name];
  }
  static getYScaleFromType(
    yScaleType: string
  ): Plottable.QuantitativeScale<number> {
    if (yScaleType === 'log') {
      return new Plottable.Scales.ModifiedLog();
    } else if (yScaleType === 'linear') {
      return new Plottable.Scales.Linear();
    } else {
      throw new Error('Unrecognized yScale type ' + yScaleType);
    }
  }
  /**
   * Update the selected series on the chart.
   */
  public setVisibleSeries(names: string[]) {
    names = names.sort();
    this.seriesNames = names;
    names.reverse(); // draw first series on top
    this.datasets.forEach((d) => d.offUpdate(this.onDatasetChanged));
    this.datasets = names.map((r) => this.getDataset(r));
    this.datasets.forEach((d) => d.onUpdate(this.onDatasetChanged));
    if (this.linePlot) this.linePlot.datasets(this.datasets);
    if (this.smoothingEnabled) {
      if (this.smoothLinePlot) this.smoothLinePlot.datasets(this.datasets);
    }
    if (this.marginAreaPlot) {
      this.marginAreaPlot.datasets(this.datasets);
    }
    this.updateSpecialDatasets();
  }
  /**
   * Samples a dataset so that it contains no more than _MAX_MARKERS number of
   * data points. This function returns the original dataset if it does not
   * exceed that many points.
   */
  public createSampledDatasetForMarkers(
    original: Plottable.Dataset
  ): Plottable.Dataset {
    const originalData = original.data();
    if (originalData.length <= _MAX_MARKERS) {
      // This dataset is small enough. Do not sample.
      return original;
    }
    // Downsample the data. Otherwise, too many markers clutter the chart.
    const skipLength = Math.ceil(originalData.length / _MAX_MARKERS);
    const data = new Array(Math.floor(originalData.length / skipLength));
    for (let i = 0, j = 0; i < data.length; i++, j += skipLength) {
      data[i] = originalData[j];
    }
    return new Plottable.Dataset(data, original.metadata());
  }
  /**
   * Set the data of a series on the chart.
   */
  public setSeriesData(name: string, data: vz_chart_helpers.ScalarDatum[]) {
    this.getDataset(name).data(data);
  }
  public smoothingUpdate(weight: number) {
    this.smoothingWeight = weight;
    this.datasets.forEach((d) => this.resmoothDataset(d));
    if (!this.smoothingEnabled) {
      if (this.linePlot) this.linePlot.addClass('ghost');
      if (this.scatterPlot)
        this.scatterPlot.y(this.smoothedAccessor, this.yScale);
      this.smoothingEnabled = true;
      if (this.smoothLinePlot) this.smoothLinePlot.datasets(this.datasets);
    }
    if (this.markersScatterPlot) {
      // Use the correct accessor for marker positioning.
      this.markersScatterPlot.y(this.getYAxisAccessor(), this.yScale);
    }
    this.updateSpecialDatasets();
  }
  public smoothingDisable() {
    if (this.smoothingEnabled) {
      if (this.linePlot) this.linePlot.removeClass('ghost');
      if (this.scatterPlot)
        this.scatterPlot.y(this.yValueAccessor, this.yScale);
      if (this.smoothLinePlot) this.smoothLinePlot.datasets([]);
      this.smoothingEnabled = false;
      this.updateSpecialDatasets();
    }
    if (this.markersScatterPlot) {
      // Use the correct accessor (which depends on whether smoothing is
      // enabled) for marker positioning.
      this.markersScatterPlot.y(this.getYAxisAccessor(), this.yScale);
    }
  }
  public setTooltipSortingMethod(method: TooltipSortingMethod) {
    this.tooltipSortingMethod = method;
  }
  public setTooltipPosition(position: TooltipPosition) {
    this.tooltipPosition = position;
  }
  public renderTo(targetSVG: d3.Selection<any, any, any, any>) {
    this.outer.renderTo(targetSVG);
    if (this._defaultXRange != null) {
      // A higher-level component provided a default range for the X axis.
      // Start with that range.
      this.resetXDomain();
    }
    if (this._defaultYRange != null) {
      // A higher-level component provided a default range for the Y axis.
      // Start with that range.
      this.resetYDomain();
    }
  }
  public redraw() {
    this.outer.redraw();
  }
  public destroy() {
    // Destroying outer destroys all subcomponents recursively.
    if (this.outer) this.outer.destroy();
  }
}
