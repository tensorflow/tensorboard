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
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {fromEvent, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import * as d3 from '../../third_party/d3';
import {HCLColor} from '../../third_party/d3';
import {
  TimeSelection,
  TimeSelectionAffordance,
  TimeSelectionWithAffordance,
} from '../card_fob/card_fob_types';
import {formatTickNumber} from './formatter';
import {
  Bin,
  HistogramData,
  HistogramDatum,
  HistogramMode,
  TimeProperty,
} from './histogram_types';

type BinScale = d3.ScaleLinear<number, number>;
type CountScale = d3.ScaleLinear<number, number>;
export type TemporalScale =
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

export interface TooltipData {
  xPositionInBinCoord: number;
  closestDatum: HistogramDatum;
  // Bin closest to the cursor in the `closestDatum`.
  closestBin: Bin;
  xAxis: {
    position: number;
    label: string;
  };
  yAxis: {
    position: number;
    label: string;
  };
  value: {
    position: {x: number; y: number};
    label: string;
  };
}

@Component({
  standalone: false,
  selector: 'tb-histogram',
  templateUrl: 'histogram_component.ng.html',
  styleUrls: ['histogram_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistogramComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('main') private readonly main!: ElementRef;
  @ViewChild('xAxis') private readonly xAxis!: ElementRef;
  @ViewChild('yAxis') private readonly yAxis!: ElementRef;
  @ViewChild('content') private readonly content!: ElementRef;
  @ViewChild('histograms') private readonly histograms!: ElementRef;

  @Input() mode: HistogramMode = HistogramMode.OFFSET;

  @Input() timeProperty: TimeProperty = TimeProperty.STEP;

  @Input() color?: string;

  @Input() data!: HistogramData;

  @Input() timeSelection: TimeSelection | null = null;

  @Output() onLinkedTimeSelectionChanged =
    new EventEmitter<TimeSelectionWithAffordance>();
  @Output() onLinkedTimeToggled = new EventEmitter();

  readonly HistogramMode = HistogramMode;
  readonly TimeProperty = TimeProperty;

  tooltipData: null | TooltipData = null;

  private ngUnsubscribe = new Subject<void>();
  private readonly layout: Layout = {
    histogramHeight: 0,
    contentClientRect: {height: 0, width: 0},
  };
  scales: Scales | null = null;

  private formatters = {
    binNumber: formatTickNumber,
    count: d3.format('.3n'),
    // DefinitelyTyped is incorrect that the `timeFormat` only takes `Date` as
    // an input. Better type it for downstream types.
    wallTime: d3.timeFormat('%m/%d %X') as unknown as (
      dateSinceEpoch: number
    ) => string,
    step: d3.format('.0f'),
    relative: (timeDiffInMs: number): string => {
      // TODO(tensorboarad-team): this `.1r` drops important information and
      // needs to be fixed. For example, `24h` would be shown as `20h`. This
      // behavior is a carry over from  vz-histogram-timeseries for now.
      return d3.format('.1r')(timeDiffInMs / 3.6e6) + 'h'; // Convert to hours.
    },
  };
  private domVisible = false;

  constructor(private readonly changeDetector: ChangeDetectorRef) {
    // `data` and layout are not be available at the constructor time. Since we
    // recalculate the scales after the view becomes first visible, let's just
    // initialize `scales` with their default values.
    // this.scales = this.computeScales([]);
  }

  ngOnChanges() {
    this.updateChartIfVisible();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  ngAfterViewInit() {
    fromEvent<MouseEvent>(this.main.nativeElement, 'mousemove', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => this.onMouseMove(event));
  }

  getCssTranslatePx(x: number, y: number): string {
    return `translate(${x}px, ${y}px)`;
  }

  getClosestBinFromBinCoordinate(
    datum: HistogramDatum,
    xInBinCoord: number
  ): Bin {
    if (!datum.bins.length) {
      return {x: 0, dx: 0, y: 0};
    }

    const firstBin = datum.bins[0];
    const lastBin = datum.bins.slice(-1)[0];
    if (xInBinCoord < firstBin.x) return firstBin;
    if (xInBinCoord >= lastBin.x + lastBin.dx) return lastBin;

    const closestBin = datum.bins.find((bin) => {
      return bin.x <= xInBinCoord && xInBinCoord < bin.x + bin.dx;
    })!;
    return closestBin;
  }

  getUiCoordFromBinForContent(bin: Bin): {x: number; y: number} {
    if (!this.scales) return {x: 0, y: 0};
    return {
      x: this.scales.binScale(getXCentroid(bin)),
      y: this.scales.countScale(bin.y),
    };
  }

  getHistogramPath(datum: HistogramDatum): string {
    // Unlike other methods used in Angular template, if we return non-empty
    // value before the DOM and everything is initialized, this method can emit
    // junk (path with NaN) values causing browser to noisily print warnings.
    if (!this.scales || !datum.bins.length) return '';
    const xScale = this.scales.binScale;
    const yScale = this.scales.countScale;

    const firstBin = datum.bins[0];
    const lastBin = datum.bins.slice(-1)[0];
    const pathBuilder = [`M${xScale(getXCentroid(firstBin))},${yScale(0)}`];

    for (const bin of datum.bins) {
      pathBuilder.push(`L${xScale(getXCentroid(bin))},${yScale(bin.y)}`);
    }

    pathBuilder.push(`L${xScale(getXCentroid(lastBin))},${yScale(0)}`);
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
    if (!this.scales || this.mode === HistogramMode.OVERLAY) {
      return '';
    }
    return this.getCssTranslatePx(
      0,
      this.scales.temporalScale(this.getTimeValue(datum))
    );
  }

  getSteps(): number[] {
    return this.data.map((datum) => datum.step);
  }

  isTimeSelectionEnabled(
    linkedTime: TimeSelection | null
  ): linkedTime is TimeSelection {
    return Boolean(
      this.mode === HistogramMode.OFFSET &&
        this.timeProperty === TimeProperty.STEP &&
        this.scales &&
        linkedTime
    );
  }

  isDatumInTimeSelectionRange(datum: HistogramDatum): boolean {
    if (!this.isTimeSelectionEnabled(this.timeSelection)) {
      return true;
    }
    if (this.timeSelection.end === null) {
      return this.timeSelection.start.step === datum.step;
    }
    return (
      this.timeSelection.start.step <= datum.step &&
      this.timeSelection.end.step >= datum.step
    );
  }

  getHistogramFill(datum: HistogramDatum): string {
    return this.scales
      ? this.scales.d3ColorScale(this.getTimeValue(datum))
      : '';
  }

  updateColorOnHover(
    event: MouseEvent,
    datum: HistogramDatum,
    isHover: boolean
  ) {
    // When link time is disabled all histogram should be colored.
    if (!this.isTimeSelectionEnabled(this.timeSelection)) {
      return;
    }
    // Target histogram should be colored When datum is in range.
    if (this.isDatumInTimeSelectionRange(datum)) {
      return;
    }
    if (isHover) {
      (event.target! as HTMLElement).classList.remove('no-color');
    } else {
      (event.target! as HTMLElement).classList.add('no-color');
    }
  }

  getGridTickYLocs(): number[] {
    if (!this.scales || this.mode === HistogramMode.OFFSET) return [];
    const yScale = this.scales.countScale;
    return yScale.ticks().map((tick) => yScale(tick));
  }

  onResize() {
    this.updateClientRects();
    this.updateChartIfVisible();
  }

  onVisibilityChange({visible}: {visible: boolean}) {
    this.domVisible = visible;
    if (!visible) return;
    this.updateClientRects();
    this.updateChartIfVisible();
  }

  /**
   * Handles linked time range change on clicking a histogram. When a single step is
   * currently selected, clicking on a histogram step will create a range incorporating
   * the currently selected step and the clicked step. When a range is currently
   * selected, clicking on a histogram step outside that range will expand the range to
   * include the clicked step.
   */
  onLinkedTimeRangeChanged(datum: HistogramDatum) {
    if (!this.isTimeSelectionEnabled(this.timeSelection)) {
      return;
    }

    const startStep = this.timeSelection.start.step;
    const endStep = this.timeSelection.end?.step;
    const nextStartStep = datum.step < startStep ? datum.step : startStep;
    let nextEndStep = endStep;

    if (nextEndStep === undefined) {
      nextEndStep = datum.step > startStep ? datum.step : startStep;
    } else {
      nextEndStep = datum.step > nextEndStep ? datum.step : nextEndStep;
    }

    if (
      (nextStartStep !== startStep || nextEndStep !== endStep) &&
      nextStartStep !== nextEndStep
    ) {
      this.onLinkedTimeSelectionChanged.emit({
        timeSelection: {
          start: {step: nextStartStep},
          end: {step: nextEndStep},
        },
        affordance: TimeSelectionAffordance.HISTOGRAM_CLICK_TO_RANGE,
      });
    }
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
    if (this.content) {
      this.layout.contentClientRect =
        this.content.nativeElement.getBoundingClientRect();
      this.layout.histogramHeight = this.layout.contentClientRect.height / 2.5;
    }
  }

  private updateChartIfVisible() {
    if (!this.domVisible) return;
    this.scales = this.computeScales(this.data);
    // Update axes DOM directly using d3 API.
    this.renderXAxis();
    this.renderYAxis();
    // Update Angular rendered part of the histogram.
    this.changeDetector.detectChanges();
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
    const d3Color = d3.hcl(this.color || '#000');
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

    return {
      binScale,
      d3ColorScale,
      countScale,
      temporalScale,
    };
  }

  private renderXAxis() {
    if (!this.scales) return;
    const {width} = this.layout.contentClientRect;
    const xAxis = d3
      .axisBottom(this.scales.binScale)
      .ticks(Math.max(2, width / 20));
    xAxis.tickFormat(this.formatters.binNumber);
    xAxis(d3.select(this.xAxis.nativeElement));
  }

  private getYAxisFormatter() {
    // d3 on DefinitelyTyped is typed incorrectly and it does not allow function
    // that takes (d: Data) => string to be specified in the parameter unlike
    // the real d3.
    if (this.mode === HistogramMode.OVERLAY) {
      return this.formatters.count;
    }
    switch (this.timeProperty) {
      case TimeProperty.WALL_TIME:
        return this.formatters.wallTime;
      case TimeProperty.STEP: {
        return this.formatters.step;
      }
      case TimeProperty.RELATIVE: {
        return this.formatters.relative;
      }
      default:
        const _ = this.timeProperty as never;
        throw RangeError(`Y axis formatter for ${_} must be implemented`);
    }
  }

  private getMaxTicks(yScale: Scales[keyof Scales]) {
    const {height} = this.layout.contentClientRect;
    const maxPerHeight = height / 15;
    if (this.timeProperty === TimeProperty.STEP) {
      const [min, max] = yScale.domain() as [number, number];
      const numberOfSteps = Math.max(max - min + 1, 1);
      return Math.min(numberOfSteps, maxPerHeight);
    }

    return maxPerHeight;
  }

  private renderYAxis() {
    if (!this.scales) return;
    const yScale =
      this.mode === HistogramMode.OVERLAY
        ? this.scales.countScale
        : this.scales.temporalScale;
    const maxTicks = this.getMaxTicks(yScale);
    const yAxis = d3.axisRight(yScale).ticks(Math.max(2, maxTicks));
    // d3 on DefinitelyTyped is typed incorrectly and it does not allow
    // function that takes (d: Data) => string to be specified in the
    // parameter unlike the real d3.
    const anyYAxis = yAxis as any;
    anyYAxis.tickFormat(this.getYAxisFormatter());
    yAxis(d3.select(this.yAxis.nativeElement));
  }

  private findClosestDatumIndex(mouseEvent: MouseEvent): number {
    let cursor: Element | null = mouseEvent.target as Element;
    let child: Element = cursor;

    while (cursor && cursor !== this.histograms.nativeElement) {
      child = cursor;
      cursor = cursor.parentElement;
    }
    return !cursor ? -1 : Array.from(cursor.children).indexOf(child);
  }

  // This method is hard to precisely test with DOM. Instead of asserting on
  // DOM, we are exposing this method so it can be tested with a manual
  // invocation.
  onMouseMoveForTestOnly(mouseEvent: MouseEvent) {
    return this.onMouseMove(mouseEvent);
  }

  private onMouseMove(mouseEvent: MouseEvent) {
    if (!this.scales) return;
    const relativeX = mouseEvent.offsetX;
    const relativeY = mouseEvent.offsetY;

    const closestIndex = this.findClosestDatumIndex(mouseEvent);
    if (closestIndex < 0) return;

    const binCoord = this.scales.binScale.invert(relativeX);
    const closestDatum = this.data[closestIndex];
    const closestBin = this.getClosestBinFromBinCoordinate(
      closestDatum,
      binCoord
    );
    this.tooltipData = {
      value: {
        position: {x: relativeX, y: relativeY},
        label:
          this.mode === HistogramMode.OFFSET
            ? this.formatters.count(closestBin.y)
            : `Step: ${this.formatters.step(closestDatum.step)}`,
      },
      xAxis: {
        position: this.getUiCoordFromBinForContent(closestBin).x,
        label: this.formatters.binNumber(getXCentroid(closestBin)),
      },
      yAxis: {
        position: this.scales.countScale(
          this.mode === HistogramMode.OFFSET ? 0 : closestBin.y
        ),
        label:
          this.mode === HistogramMode.OFFSET
            ? this.getYAxisFormatter()(this.getTimeValue(closestDatum))
            : this.formatters.binNumber(closestBin.y),
      },
      xPositionInBinCoord: binCoord,
      closestDatum,
      closestBin,
    };

    this.changeDetector.detectChanges();
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

function getXCentroid(bin: Bin): number {
  return bin.x + bin.dx * 0.5;
}
