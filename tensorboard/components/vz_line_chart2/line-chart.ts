/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
import * as d3 from 'd3';
import * as Plottable from 'plottable';
import * as _ from 'lodash';
import * as vz_chart_helpers from '../vz_chart_helpers/vz-chart-helpers';
import {
  VzChartTooltip,
  TooltipPosition,
} from '../vz_chart_helpers/vz-chart-tooltip';
import {LogScale} from './log-scale';
import {LinearScale} from './linear-scale';
import {ITfScale} from './tf-scale';
import {PanZoomDragLayer} from './panZoomDragLayer';
import {PointerInteraction} from '../vz_chart_helpers/plottable-interactions';

type Point = vz_chart_helpers.Point;

export interface FillArea {
  // The lower end of the fill area.
  lowerAccessor: Plottable.IAccessor<number>;
  // The higher end of the fill area.
  higherAccessor: Plottable.IAccessor<number>;
}
enum TooltipColumnEvalType {
  TEXT,
  DOM,
}
export enum YScaleType {
  LOG = 'log',
  LINEAR = 'linear',
}

export type LineChartStatus = {
  smoothingEnabled: boolean;
};

export enum TooltipSortingMethod {
  DEFAULT = 'default',
  ASCENDING = 'ascending',
  DESCENDNG = 'descending',
  NEAREST = 'nearest',
}

/**
 * Adds private APIs for default swatch column on the first column.
 */
interface TooltipColumn extends vz_chart_helpers.TooltipColumn {
  evalType?: TooltipColumnEvalType;
  enter: () => void;
}
export type Metadata = {
  name: string;
  meta: any;
};
/**
 * The maximum number of marker symbols within any line for a data series. Too
 * many markers clutter the chart.
 */
const _MAX_MARKERS = 20;

export class LineChart {
  private name2datasets: {
    [name: string]: Plottable.Dataset;
  } = {};
  private seriesNames: string[] = [];
  private xAccessor: Plottable.IAccessor<number | Date>;
  private xScale: Plottable.QuantitativeScale<number | Date>;
  private yScale: ITfScale;
  private gridlines: Plottable.Components.Gridlines;
  private center: Plottable.Components.Group;
  private xAxis: Plottable.Axes.Numeric | Plottable.Axes.Time;
  private yAxis: Plottable.Axes.Numeric;
  private outer: Plottable.Components.Table;
  private colorScale: Plottable.Scales.Color;
  private symbolFunction?: vz_chart_helpers.SymbolFn;
  private tooltipColumns: vz_chart_helpers.TooltipColumn[];
  private tooltip: VzChartTooltip;
  private tooltipInteraction: Plottable.Interactions.Pointer;
  private tooltipPointsComponent: Plottable.Component;
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

  private _lastMousePosition?: Plottable.Point;
  private _lastDrawBBox?: DOMRect;
  private _redrawRaf: number | null = null;
  private _invalidateLayoutRaf: number | null = null;
  private _tooltipUpdateAnimationFrame: number | null = null;

  private targetSVG?: d3.Selection<any, any, any, any>;

  constructor(
    xComponentsCreationMethod: () => vz_chart_helpers.XComponents,
    yValueAccessor: Plottable.IAccessor<number>,
    yScaleType: string,
    colorScale: Plottable.Scales.Color,
    tooltip: VzChartTooltip,
    tooltipColumns: vz_chart_helpers.TooltipColumn[],
    fillArea: FillArea,
    defaultXRange?: number[],
    defaultYRange?: number[],
    symbolFunction?: vz_chart_helpers.SymbolFn,
    xAxisFormatter?: (num: number) => string
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
    this.yScale.setValueProviderForDomain(() =>
      this.getValuesForYAxisDomainCompute()
    );
    this.yAxis = new Plottable.Axes.Numeric(this.yScale, 'left');
    let yFormatter = vz_chart_helpers.multiscaleFormatter(
      vz_chart_helpers.Y_AXIS_FORMATTER_PRECISION
    );
    this.yAxis
      .margin(0)
      .tickLabelPadding(5)
      .formatter(yFormatter);
    this.yAxis.usesTextWidthApproximation(true);
    this.fillArea = fillArea;
    const panZoomLayer = new PanZoomDragLayer(this.xScale, this.yScale, () =>
      this.resetDomain()
    );
    this.tooltipInteraction = this.createTooltipInteraction(panZoomLayer);
    this.tooltipPointsComponent = new Plottable.Component();
    const plot = this.buildPlot(this.xScale, this.yScale, fillArea);
    this.gridlines = new Plottable.Components.Gridlines(
      this.xScale,
      this.yScale
    );
    let xZeroLine = null;
    if (yScaleType !== YScaleType.LOG) {
      xZeroLine = new Plottable.Components.GuideLineLayer('horizontal');
      xZeroLine.scale(this.yScale).value(0);
    }
    let yZeroLine = new Plottable.Components.GuideLineLayer('vertical');
    yZeroLine.scale(this.xScale).value(0);
    this.center = new Plottable.Components.Group([
      this.gridlines,
      xZeroLine,
      yZeroLine,
      plot,
      this.tooltipPointsComponent,
      panZoomLayer,
    ].filter(Boolean) as Plottable.Component[]);
    this.center.addClass('main');
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
      this.yScale.ignoreOutlier(ignoreYOutliers);
      this.resetYDomain();
    }
  }
  private getValuesForYAxisDomainCompute(): number[] {
    const accessors = this.getAccessorsForComputingYRange();
    let datasetToValues: (d: Plottable.Dataset) => number[][] = (d) => {
      return accessors.map((accessor) =>
        d.data().map((x) => accessor(x, -1, d))
      );
    };
    return _.flattenDeep<number>(this.datasets.map(datasetToValues)).filter(
      isFinite
    );
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
      // (Copied from vz_line_chart.DragZoomLayer.unzoom.)
      const xScale = this.xScale as any;
      xScale._domainMin = null;
      xScale._domainMax = null;
      xDomain = xScale._getExtent();
    }
    this.xScale.domain(xDomain);
  }
  private resetYDomain() {
    if (this._defaultYRange != null) {
      // Use the range specified by the caller.
      this.yScale.domain(this._defaultYRange);
    } else {
      // TfScale has all the logics for scaling and we manually trigger it with
      // `autoDomain`. However, this enables the autoDomain mode which updates
      // the domain on any dataset change and this is not desirably especially
      // when a run is not finished yet; we don't want the graph to change in
      // scale while user is inspecting the graph. By setting the `domain`
      // explicitly, we can turn the feature off.
      this.yScale.autoDomain();
      this.yScale.domain(this.yScale.domain());
    }
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
    pzdl: PanZoomDragLayer
  ): Plottable.Interactions.Pointer {
    const pi = new PointerInteraction();
    // Disable interaction while drag zooming.
    const disableTooltipUpdate = () => {
      pi.enabled(false);
      this.hideTooltips();
    };
    const enableTooltipUpdate = () => pi.enabled(true);
    pzdl.onPanStart(disableTooltipUpdate);
    pzdl.onDragZoomStart(disableTooltipUpdate);
    pzdl.onPanEnd(enableTooltipUpdate);
    pzdl.onDragZoomEnd(enableTooltipUpdate);
    // When using wheel, cursor position does not change. Redraw the tooltip
    // using the last known mouse position.
    pzdl.onScrollZoom(() => this.updateTooltipContent(this._lastMousePosition));
    pi.onPointerMove((p: Plottable.Point) => {
      this._lastMousePosition = p;
      this.updateTooltipContent(p);
    });
    pi.onPointerExit(() => this.hideTooltips());
    return pi;
  }
  private updateTooltipContent(p?: Plottable.Point): void {
    // Line plot must be initialized to draw.
    if (!p) return;
    if (!this.linePlot) return;
    if (this._tooltipUpdateAnimationFrame !== null) {
      this.cancelAnimationFrame(this._tooltipUpdateAnimationFrame);
    }
    this._tooltipUpdateAnimationFrame = window.requestAnimationFrame(() => {
      let target = {
        x: p.x,
        y: p.y,
      };
      let bbox: SVGRect = (<any>this.gridlines.content().node()).getBBox();
      // pts is the closets point to the tooltip for each dataset
      let pts = this.linePlot!.datasets()
        .map((dataset) => this.findClosestPoint(target, dataset))
        .filter(Boolean) as Point[];
      let intersectsBBox = Plottable.Utils.DOM.intersectsBBox;
      // We draw tooltips for points that are NaN, or are currently visible
      const ptsForTooltips = pts.filter(
        (p) =>
          intersectsBBox(p.x, p.y, bbox) ||
          isNaN(this.yValueAccessor(p.datum, 0, p.dataset))
      );
      // Only draw little indicator circles for the non-NaN points
      let ptsToCircle = ptsForTooltips.filter(
        (p) => !isNaN(this.yValueAccessor(p.datum, 0, p.dataset))
      );
      if (pts.length !== 0 && this.scatterPlot) {
        this.scatterPlot.attr('display', 'none');
        const ptsSelection: any = this.tooltipPointsComponent
          .content()
          .selectAll('.point')
          .data(ptsToCircle, (p: Point) => p.dataset.metadata().name);
        ptsSelection
          .enter()
          .append('circle')
          .classed('point', true);
        ptsSelection
          .attr('r', vz_chart_helpers.TOOLTIP_CIRCLE_SIZE)
          .attr('cx', (p: Point) => p.x)
          .attr('cy', (p: Point) => p.y)
          .style('stroke', 'none')
          .attr('fill', (p: Point) =>
            this.colorScale.scale(p.dataset.metadata().name)
          );
        ptsSelection.exit().remove();
        this.drawTooltips(ptsForTooltips, target, this.tooltipColumns);
      } else {
        this.hideTooltips();
      }
    });
  }
  private hideTooltips(): void {
    this.cancelAnimationFrame(this._tooltipUpdateAnimationFrame);
    this.tooltip.hide();
    if (this.scatterPlot) {
      this.scatterPlot.attr('display', 'block');
    }
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
    points: Point[],
    target: {x: number; y: number},
    tooltipColumns: vz_chart_helpers.TooltipColumn[]
  ) {
    if (!points.length) {
      this.tooltip.hide();
      return;
    }
    const {colorScale} = this;
    const swatchCol = {
      title: '',
      static: false,
      evalType: TooltipColumnEvalType.DOM,
      evaluate(d: Point) {
        d3.select(this)
          .select('span')
          .style('background-color', () =>
            colorScale.scale(d.dataset.metadata().name)
          );
        return '';
      },
      enter(d: Point) {
        d3.select(this)
          .append('span')
          .classed('swatch', true)
          .style('background-color', () =>
            colorScale.scale(d.dataset.metadata().name)
          );
      },
    };
    tooltipColumns = [swatchCol, ...tooltipColumns];
    const dist = (p: Point) =>
      Math.pow(p.x - target.x, 2) + Math.pow(p.y - target.y, 2);
    const closestDist = _.min(points.map(dist));
    const valueSortMethod = this.smoothingEnabled
      ? this.smoothedAccessor
      : this.yValueAccessor;
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
    const self = this;
    const tooltipContent = (this.tooltip.content() as unknown) as Element;
    const table = d3.select(tooltipContent).select('table');
    const header = table
      .select('thead')
      .selectAll('th')
      .data(tooltipColumns, (column: vz_chart_helpers.TooltipColumn) => {
        return column.title;
      });
    header
      .enter()
      .append('th')
      .text((col: vz_chart_helpers.TooltipColumn) => col.title)
      .nodes();
    header.exit().remove();
    const rows = table
      .select('tbody')
      .selectAll('tr')
      .data(points, (pt: Point) => {
        return pt.dataset.metadata().name;
      });

    rows
      .classed('distant', (d: Point) => {
        // Grey out the point if any of the following are true:
        // - The cursor is outside of the x-extent of the dataset
        // - The point's y value is NaN
        let firstPoint = d.dataset.data()[0];
        let lastPoint = _.last(d.dataset.data());
        let firstX = this.xScale.scale(
          this.xAccessor(firstPoint, 0, d.dataset)
        );
        let lastX = this.xScale.scale(this.xAccessor(lastPoint, 0, d.dataset));
        let s = this.smoothingEnabled
          ? d.datum.smoothed
          : this.yValueAccessor(d.datum, 0, d.dataset);
        return target.x < firstX || target.x > lastX || isNaN(s);
      })
      .classed('closest', (p: Point) => dist(p) === closestDist)
      .each(function(point: Point) {
        self.drawTooltipRow(this, tooltipColumns, point);
      })
      // reorders DOM to match the ordering of the `data`.
      .order();
    rows.exit().remove();
    rows
      .enter()
      .append('tr')
      .each(function(point: Point) {
        self.drawTooltipRow(this, tooltipColumns, point);
      })
      .nodes();

    if (this.targetSVG) {
      this.tooltip.updateAndPosition(this.targetSVG.node());
    }
  }
  private drawTooltipRow(
    row: d3.BaseType,
    tooltipColumns: vz_chart_helpers.TooltipColumn[],
    point: Point
  ) {
    const self = this;
    const columns = d3
      .select(row)
      .selectAll('td')
      .data(tooltipColumns);
    columns.each(function(col: TooltipColumn) {
      // Skip column value update when the column is static.
      if (col.static) return;
      self.drawTooltipColumn.call(self, this, col, point);
    });
    columns
      .enter()
      .append('td')
      .each(function(col: TooltipColumn) {
        if (col.enter) col.enter.call(this, point);
        self.drawTooltipColumn.call(self, this, col, point);
      });
  }
  private drawTooltipColumn(
    column: d3.BaseType,
    tooltipCol: TooltipColumn,
    point: Point
  ) {
    const {smoothingEnabled} = this;
    if (tooltipCol.evalType == TooltipColumnEvalType.DOM) {
      tooltipCol.evaluate.call(column, point, {smoothingEnabled});
    } else {
      d3.select(column).text(
        tooltipCol.evaluate.call(column, point, {smoothingEnabled})
      );
    }
  }
  private findClosestPoint(
    target: {x: number; y: number},
    dataset: Plottable.Dataset
  ): Point | null {
    const xPoints: number[] = dataset
      .data()
      .map((d, i) => this.xScale.scale(this.xAccessor(d, i, dataset)));
    let idx: number = _.sortedIndex(xPoints, target.x);
    if (xPoints.length == 0) return null;
    if (idx === xPoints.length) {
      idx = idx - 1;
    } else if (idx !== 0) {
      const prevDist = Math.abs(xPoints[idx - 1] - target.x);
      const nextDist = Math.abs(xPoints[idx] - target.x);
      idx = prevDist < nextDist ? idx - 1 : idx;
    }
    const datum = dataset.data()[idx];
    const y = this.smoothingEnabled
      ? this.smoothedAccessor(datum, idx, dataset)
      : this.yValueAccessor(datum, idx, dataset);
    return {
      x: xPoints[idx],
      y: this.yScale.scale(y),
      datum,
      dataset,
    };
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
      this.name2datasets[name] = new Plottable.Dataset([], {
        name,
        meta: null,
      });
    }
    return this.name2datasets[name];
  }
  static getYScaleFromType(yScaleType: string): ITfScale {
    if (yScaleType === YScaleType.LOG) {
      return new LogScale();
    } else if (yScaleType === YScaleType.LINEAR) {
      return new LinearScale();
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
    if (this.linePlot) {
      this.linePlot.datasets(this.datasets);
    }
    if (this.smoothingEnabled && this.smoothLinePlot) {
      this.smoothLinePlot.datasets(this.datasets);
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
   * Sets the data of a series on the chart.
   */
  public setSeriesData(name: string, data: vz_chart_helpers.ScalarDatum[]) {
    this.getDataset(name).data(data);
    this.measureBBoxAndMaybeInvalidateLayoutInRaf();
  }
  /**
   * Sets the metadata of a series on the chart.
   */
  public setSeriesMetadata(name: string, meta: any) {
    const newMeta = Object.assign({}, this.getDataset(name).metadata(), {
      meta,
    });
    this.getDataset(name).metadata(newMeta);
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

  public renderTo(targetSVG: d3.Selection<any, any, any, any>) {
    this.targetSVG = targetSVG;
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
    this.measureBBoxAndMaybeInvalidateLayoutInRaf();
  }
  public redraw() {
    this.cancelAnimationFrame(this._redrawRaf);
    this._redrawRaf = window.requestAnimationFrame(() => {
      this.measureBBoxAndMaybeInvalidateLayout();
      this.outer.redraw();
    });
  }
  private measureBBoxAndMaybeInvalidateLayoutInRaf() {
    this.cancelAnimationFrame(this._invalidateLayoutRaf);
    this._invalidateLayoutRaf = window.requestAnimationFrame(() => {
      this.measureBBoxAndMaybeInvalidateLayout();
    });
  }
  /**
   * Measures bounding box of the anchor node and determines whether the layout
   * needs to be re-done with measurement cache invalidated. Plottable improved
   * performance of rendering by caching expensive DOM measurement but this
   * cache can be poisoned in case the anchor node is in a wrong state -- namely
   * `display: none` where all dimensions are 0.
   */
  private measureBBoxAndMaybeInvalidateLayout() {
    if (!this.targetSVG) return;
    if (this._lastDrawBBox) {
      const {width: prevWidth} = this._lastDrawBBox;
      const {width} = this.targetSVG.node().getBoundingClientRect();
      if (prevWidth == 0 && prevWidth < width) this.outer.invalidateCache();
    }
    this._lastDrawBBox = this.targetSVG.node().getBoundingClientRect();
  }
  public destroy() {
    // Destroying outer destroys all subcomponents recursively.
    this.cancelAnimationFrame(this._redrawRaf);
    this.cancelAnimationFrame(this._invalidateLayoutRaf);
    if (this.outer) this.outer.destroy();
  }
  public onAnchor(fn: () => void) {
    if (this.outer) this.outer.onAnchor(fn);
  }

  private cancelAnimationFrame(id: number | null) {
    if (id === null) return;
    this.cancelAnimationFrame(id);
  }
}
