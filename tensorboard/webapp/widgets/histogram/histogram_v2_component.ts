/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core';

import * as d3 from '../../third_party/d3';
import {HCLColor} from '../../third_party/d3';
import {
  ColorScale,
  HistogramData,
  HistogramDatum,
  HistogramMode,
  TimeProperty,
} from './histogram_types';

type BinScale = d3.ScaleLinear<number, number>;
type CountScale = d3.ScaleLinear<number, number>;
type TemporalScale =
  | d3.ScaleLinear<number, number>
  | d3.ScaleTime<number, number>;
type D3ColorScale = d3.ScaleLinear<HCLColor, string>;

interface Layout {
  histogramHeight: number;
  contentClientRect: {width: number; height: number};
}

interface Scales {
  binScale: BinScale;
  countScale: CountScale;
  temporalScale: TemporalScale;
  d3ColorScale: D3ColorScale;
}

@Component({
  selector: 'tb-histogram-v2',
  templateUrl: 'histogram_v2_component.ng.html',
  styleUrls: ['histogram_v2_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistogramV2Component implements OnChanges {
  @ViewChild('xAxis') private readonly xAxis!: ElementRef;
  @ViewChild('yAxis') private readonly yAxis!: ElementRef;
  @ViewChild('content') private readonly content!: ElementRef;

  @Input() mode: HistogramMode = HistogramMode.OFFSET;

  @Input() timeProperty: TimeProperty = TimeProperty.STEP;

  /**
   * TODO(tensorboard-team): VzHistogram only needs 'name', 'colorScale'
   * properties to determine the histogram color. We could replace these with a
   * single 'color' property to make the interface simpler.
   */
  @Input() colorScale?: ColorScale;

  @Input() name!: string;

  @Input() data!: HistogramData;

  readonly HistogramMode = HistogramMode;

  private layout: Layout = {
    histogramHeight: 0,
    contentClientRect: {height: 0, width: 0},
  };
  private scales: Scales;
  private domInitialized = false;

  constructor(private readonly changeDetector: ChangeDetectorRef) {
    // `data` may not be available at the constructor time. Since we recalculate
    // the scales on the `ngAfterViewInit`, let's just initialize `scales` with
    // their default values.
    this.scales = this.computeScales([]);
  }

  ngOnChanges() {
    if (this.domInitialized) {
      this.updateChart();
    }
  }

  ngAfterViewInit() {
    this.domInitialized = true;
    this.updateClientRects();
    this.updateChart();
    this.changeDetector.detectChanges();
  }

  getHistogramPath(datum: HistogramDatum): string {
    // Unlike other methods used in Angular template, if we return non-empty
    // value before the DOM and everything is initialized, this method can emit
    // junk (path with NaN) values causing browser to noisily print warnings.
    if (!this.domInitialized || !datum.bins.length) return '';
    const xScale = this.scales.binScale;
    const yScale = this.scales.countScale;

    const firstBin = datum.bins[0];
    const lastBin = datum.bins.slice(-1)[0];
    const pathBuilder = [
      `M${xScale(firstBin.x + firstBin.dx * 0.5)},${yScale(0)}`,
    ];

    for (const bin of datum.bins) {
      pathBuilder.push(`L${xScale(bin.x + bin.dx * 0.5)},${yScale(bin.y)}`);
    }

    pathBuilder.push(`L${xScale(lastBin.x + lastBin.dx * 0.5)},${yScale(0)}`);
    pathBuilder.push('Z');
    return pathBuilder.join('');
  }

  trackByWallTime(datum: HistogramDatum): number {
    return datum.wallTime;
  }

  // translates container for histogram so we can have more sensible coordinate
  // system for reasoning with the coordinate system of a histogram.
  getGroupTransform(datum: HistogramDatum): string {
    // Unlike other methods used in Angular template, if we return non-empty
    // value before the DOM and everything is initialized, this method can emit
    // junk (translate with NaN) values causing browser to noisily print
    // warnings.
    if (!this.domInitialized || this.mode === HistogramMode.OVERLAY) return '';
    return `translate(0, ${this.scales.temporalScale(
      this.getTimeValue(datum)
    )})`;
  }

  getHistogramFill(datum: HistogramDatum): string {
    return this.scales.d3ColorScale(this.getTimeValue(datum));
  }

  getGridTickYLocs(): number[] {
    if (this.mode === HistogramMode.OFFSET) return [];
    const yScale = this.scales.countScale;
    return yScale.ticks().map((tick) => yScale(tick));
  }

  onResize() {
    this.updateClientRects();
    this.updateChart();
    this.changeDetector.detectChanges();
  }

  private getTimeValue(datum: HistogramDatum): number {
    switch (this.timeProperty) {
      case TimeProperty.WALL_TIME:
        return datum.wallTime;
      case TimeProperty.STEP:
        return datum.step;
      case TimeProperty.RELATIVE:
        return datum.wallTime - this.data[0].wallTime;
    }
  }

  private updateClientRects() {
    if (this.domInitialized && this.content) {
      this.layout.contentClientRect = this.content.nativeElement.getBoundingClientRect();
      this.layout.histogramHeight = this.layout.contentClientRect.height / 2.5;
    }
  }

  private updateChart() {
    this.scales = this.computeScales(this.data);
    this.renderXAxis();
    this.renderYAxis();
  }

  private computeScales(data: HistogramData): Scales {
    const {width, height} = this.layout.contentClientRect;
    // === Get counts from data for calculating domain below. ===
    const {min: binMin, max: binMax} = getMinMax(
      data,
      (datum) => getMin(datum.bins, (binVal) => binVal.x),
      (datum) => getMax(datum.bins, ({x, dx}) => x + dx)
    );
    const countMax = getMax(data, (datum) => {
      return getMax(datum.bins, ({y}) => y);
    });

    // === Create scale and set the domain. ===
    const binScale = d3.scaleLinear().domain([binMin, binMax]).nice();
    const temporalScale =
      this.mode !== HistogramMode.OVERLAY &&
      this.timeProperty == TimeProperty.WALL_TIME
        ? d3.scaleTime()
        : d3.scaleLinear();

    const timeValues = data.map((datum) => this.getTimeValue(datum));
    const {min: timeMin, max: timeMax} = getMinMax(timeValues, (val) => val);
    const temporalDomain = [timeMin, timeMax];

    temporalScale.domain(temporalDomain);
    const countScale = d3.scaleLinear();
    countScale.domain([0, countMax]);
    const d3Color = d3.hcl(
      this.colorScale ? this.colorScale(this.name) : '#000'
    );
    const d3ColorScale = d3.scaleLinear<HCLColor, string>();
    d3ColorScale.domain(temporalDomain);

    // === Set range on scales. ===
    // x-axis or bin scale does not change depending on a mode.
    binScale.range([0, width]);
    d3ColorScale.range([d3Color.brighter(), d3Color.darker()]);
    d3ColorScale.interpolate(d3.interpolateHcl);

    // Explanation of the coordinate systems:
    // When in the offset mode, we render in 2.5D. Y-axis both have temporal
    // element while some space is allocated to show magnitude of counts. To
    // make the coordinate system easier for the offset, we use `<g transform>`
    // to locate the histogram at the correct temporal axis and let `countScale`
    // only deal with the height of the histogram.
    // When in overlay mode, we have very simple 2D where temporal axis is not
    // used meaningfully and `countScale` act as the y-axis and thus spans
    // `[height, 0]`.
    if (this.mode === HistogramMode.OVERLAY) {
      temporalScale.range([height, height]);
      countScale.range([height, 0]);
    } else {
      const offsetAxisHeight =
        this.mode === HistogramMode.OFFSET
          ? height - this.layout.histogramHeight
          : 0;
      temporalScale.range([height - offsetAxisHeight, height]);
      countScale.range([0, -this.layout.histogramHeight]);
    }

    return {binScale, d3ColorScale, countScale, temporalScale};
  }

  private renderXAxis() {
    const {width} = this.layout.contentClientRect;
    const xAxis = d3
      .axisBottom(this.scales.binScale)
      .ticks(Math.max(2, width / 20));

    xAxis(d3.select(this.xAxis.nativeElement));
  }

  private renderYAxis() {
    const yScale =
      this.mode === HistogramMode.OVERLAY
        ? this.scales.countScale
        : this.scales.temporalScale;
    const {height} = this.layout.contentClientRect;
    const yAxis = d3.axisRight(yScale).ticks(Math.max(2, height / 15));
    // d3 on DefinitelyTyped is typed incorrectly and it does not allow function
    // that takes (d: Data) => string to be specified in the parameter unlike
    // the real d3.
    const anyYAxis = yAxis as any;
    if (this.mode === HistogramMode.OVERLAY) {
      anyYAxis.tickFormat(d3.format('.3n'));
    } else {
      switch (this.timeProperty) {
        case TimeProperty.WALL_TIME:
          anyYAxis.tickFormat(d3.timeFormat('%m/%d %X'));
          break;
        case TimeProperty.STEP: {
          anyYAxis.tickFormat(d3.format('.0f'));
          break;
        }
        case TimeProperty.RELATIVE: {
          anyYAxis.tickFormat((timeDiffInMs: number): string => {
            return d3.format('.1r')(timeDiffInMs / 3.6e6) + 'h'; // Convert to hours.
          });
          break;
        }
      }
    }

    yAxis(d3.select(this.yAxis.nativeElement));
    return yScale;
  }
}

function getMin<T>(data: T[], valueAccessor: (val: T) => number): number {
  return data.reduce((prevMin, value) => {
    return Math.min(prevMin, valueAccessor(value));
  }, Infinity);
}

function getMax<T>(data: T[], valueAccessor: (val: T) => number): number {
  return data.reduce((prevMax, value) => {
    return Math.max(prevMax, valueAccessor(value));
  }, -Infinity);
}

/**
 * Returns min and max at the same time by iterating through data once.
 */
function getMinMax<T>(
  data: T[],
  lowerValueAccessor: (val: T) => number,
  upperValueAccessor?: (val: T) => number
): {min: number; max: number} {
  if (!upperValueAccessor) {
    upperValueAccessor = lowerValueAccessor;
  }

  let min = Infinity;
  let max = -Infinity;

  for (const datum of data) {
    min = Math.min(min, lowerValueAccessor(datum));
    max = Math.max(max, upperValueAccessor(datum));
  }

  return {min, max};
}
