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
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import '../../../components/polymer/plottable-style';
import {
  getXComponents,
  multiscaleFormatter,
  Y_AXIS_FORMATTER_PRECISION,
} from '../../../components/vz_chart_helpers/vz-chart-helpers';

export class DistributionChart {
  private run2datasets: {
    [run: string]: Plottable.Dataset;
  };
  protected runs: string[];
  protected xAccessor: Plottable.IAccessor<number | Date>;
  protected xScale: Plottable.QuantitativeScale<number | Date>;
  protected yScale: Plottable.QuantitativeScale<number>;
  protected gridlines: Plottable.Components.Gridlines;
  protected center: Plottable.Components.Group;
  protected xAxis: Plottable.Axes.Numeric | Plottable.Axes.Time;
  protected yAxis: Plottable.Axes.Numeric;
  protected xLabel: Plottable.Components.AxisLabel;
  protected yLabel: Plottable.Components.AxisLabel;
  protected outer: Plottable.Components.Table;
  protected colorScale: Plottable.Scales.Color;
  private plots: Plottable.XYPlot<number | Date, number>[];
  private targetSVG: d3.Selection<any, any, any, any>;

  constructor(xType: string, colorScale: Plottable.Scales.Color) {
    this.run2datasets = {};
    this.colorScale = colorScale;
    this.buildChart(xType);
  }

  protected getDataset(run: string) {
    if (this.run2datasets[run] === undefined) {
      this.run2datasets[run] = new Plottable.Dataset([], {run: run});
    }
    return this.run2datasets[run];
  }

  protected buildChart(xType: string) {
    if (this.outer) {
      this.outer.destroy();
    }
    let xComponents = getXComponents(xType);
    this.xAccessor = xComponents.accessor;
    this.xScale = xComponents.scale;
    this.xAxis = xComponents.axis;
    this.xAxis.margin(0);
    this.xAxis.tickLabelPadding(3);
    this.yScale = new Plottable.Scales.Linear();
    this.yAxis = new Plottable.Axes.Numeric(this.yScale, 'left');
    let yFormatter = multiscaleFormatter(Y_AXIS_FORMATTER_PRECISION);
    this.yAxis.margin(0).tickLabelPadding(5).formatter(yFormatter);
    this.yAxis.usesTextWidthApproximation(true);
    let center = this.buildPlot(this.xAccessor, this.xScale, this.yScale);
    this.gridlines = new Plottable.Components.Gridlines(
      this.xScale,
      this.yScale
    );
    this.center = new Plottable.Components.Group([this.gridlines, center]);
    this.outer = new Plottable.Components.Table([
      [this.yAxis, this.center],
      [null, this.xAxis],
    ]);
  }

  protected buildPlot(xAccessor, xScale, yScale): Plottable.Component {
    let percents = [0, 228, 1587, 3085, 5000, 6915, 8413, 9772, 10000];
    let opacities = _.range(percents.length - 1).map(
      (i) => (percents[i + 1] - percents[i]) / 2500
    );
    let accessors = percents.map((p, i) => (datum) => datum[i][1]);
    let median = 4;
    let medianAccessor = accessors[median];
    let plots = _.range(accessors.length - 1).map((i) => {
      let p = new Plottable.Plots.Area<number | Date>();
      p.x(xAccessor, xScale);
      let y0 = i > median ? accessors[i] : accessors[i + 1];
      let y = i > median ? accessors[i + 1] : accessors[i];
      p.y(y, yScale);
      p.y0(y0);
      p.attr('fill', (d: any, i: number, dataset: Plottable.Dataset) =>
        this.colorScale.scale(dataset.metadata().run)
      );
      p.attr('stroke', (d: any, i: number, dataset: Plottable.Dataset) =>
        this.colorScale.scale(dataset.metadata().run)
      );
      p.attr('stroke-weight', (d: any, i: number, m: any) => '0.5px');
      p.attr('stroke-opacity', () => opacities[i]);
      p.attr('fill-opacity', () => opacities[i]);
      return p;
    });
    let medianPlot = new Plottable.Plots.Line<number | Date>();
    medianPlot.x(xAccessor, xScale);
    medianPlot.y(medianAccessor, yScale);
    medianPlot.attr('stroke', (d: any, i: number, m: any) =>
      this.colorScale.scale(m.run)
    );
    this.plots = plots;
    return new Plottable.Components.Group(plots);
  }

  public setVisibleSeries(runs: string[]) {
    this.runs = runs;
    let datasets = runs.map((r) => this.getDataset(r));
    this.plots.forEach((p) => p.datasets(datasets));
  }

  /**
   * Set the data of a series on the chart.
   */
  public setSeriesData(name: string, data: any) {
    this.getDataset(name).data(data);
  }

  public renderTo(targetSVG: d3.Selection<any, any, any, any>) {
    this.targetSVG = targetSVG;
    this.outer.renderTo(targetSVG);
  }

  public redraw() {
    this.outer.redraw();
  }

  protected destroy() {
    this.outer.destroy();
  }
}

export interface VzDistributionChart extends HTMLElement {
  setSeriesData(name: string, data: unknown): void;
  setVisibleSeries(names: readonly string[]): void;
  redraw(): void;
}

@customElement('vz-distribution-chart')
class _VzDistributionChart
  extends LegacyElementMixin(PolymerElement)
  implements VzDistributionChart
{
  static readonly template = html`
    <style include="plottable-style"></style>
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
      }
      #chartdiv {
        -webkit-user-select: none;
        -moz-user-select: none;
        flex-grow: 1;
        flex-shrink: 1;
      }
      .plottable .axis text {
        fill: currentColor;
      }
    </style>
  `;

  @property({type: Object})
  colorScale: Plottable.Scales.Color = new Plottable.Scales.Color().range(
    d3.schemeCategory10.slice()
  );

  @property({type: String})
  xType: string = 'step';

  @property({type: Boolean})
  _attached: boolean;

  @property({type: Object})
  _chart: DistributionChart;

  @property({type: Array})
  _visibleSeriesCache: string[] = [];

  @property({type: Object})
  _seriesDataCache: object = {};

  @property({type: Number}) _makeChartAsyncCallbackId: number | null = null;

  setVisibleSeries(names) {
    this._visibleSeriesCache = names;
    if (this._chart) {
      this._chart.setVisibleSeries(names);
      this.redraw();
    }
  }

  setSeriesData(name, data) {
    this._seriesDataCache[name] = data;
    if (this._chart) {
      this._chart.setSeriesData(name, data);
    }
  }

  redraw() {
    this._chart.redraw();
  }

  @observe('xType', 'colorScale', '_attached')
  _makeChart() {
    var xType = this.xType;
    var colorScale = this.colorScale;
    var _attached = this._attached;
    if (this._makeChartAsyncCallbackId !== null) {
      this.cancelAsync(this._makeChartAsyncCallbackId);
    }
    this._makeChartAsyncCallbackId = this.async(function () {
      this._makeChartAsyncCallbackId = null;
      if (!_attached) return;
      if (this._chart) this._chart.destroy();
      var chart = new DistributionChart(xType, colorScale);
      var svg = d3.select(this.$.chartdiv);
      chart.renderTo(svg);
      this._chart = chart;
    }, 350);
  }

  @observe('_chart')
  _reloadFromCache() {
    if (this._chart) {
      this._chart.setVisibleSeries(this._visibleSeriesCache);
      this._visibleSeriesCache.forEach(
        function (name) {
          this._chart.setSeriesData(name, this._seriesDataCache[name] || []);
        }.bind(this)
      );
    }
  }

  override attached() {
    this._attached = true;
  }

  override detached() {
    this._attached = false;
  }
}
