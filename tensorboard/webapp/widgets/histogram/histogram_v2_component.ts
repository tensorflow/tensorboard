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
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core';

import * as d3 from '../../third_party/d3';
import {
  ColorScale,
  HistogramData,
  HistogramMode,
  TimeProperty,
} from './histogram_types';

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

  private yScale?:
    | d3.ScaleTime<number, number>
    | d3.ScaleLinear<number, number>;

  constructor(private readonly host: ElementRef) {}

  ngOnChanges() {
    if (this.content) {
      this.ngAfterViewInit();
    }
  }

  ngAfterViewInit() {
    this.updateChart();
  }

  private updateChart() {
    this.renderXAxis(this.data);
    this.updateYScaleAndDomain(this.data);
    this.renderYAxis();
  }

  private renderXAxis(data: HistogramData) {
    const {width} = this.host.nativeElement.getBoundingClientRect();
    const {min: xMin, max: xMax} = getMinMax(
      data,
      (datum) => getMin(datum.bins, (binVal) => binVal.x),
      (datum) => getMax(datum.bins, ({x, dx}) => x + dx)
    );
    const xScale = d3
      .scaleLinear()
      .domain([xMin, xMax])
      .nice()
      .range([0, width]);
    const xAxis = d3.axisBottom(xScale).ticks(Math.max(2, width / 20));

    xAxis(d3.select(this.xAxis.nativeElement));
  }

  private updateYScaleAndDomain(data: HistogramData) {
    this.yScale =
      this.mode !== HistogramMode.OVERLAY &&
      this.timeProperty == TimeProperty.WALL_TIME
        ? d3.scaleTime()
        : d3.scaleLinear();

    let domain: [number, number] = [0, 1];
    if (this.mode === HistogramMode.OVERLAY) {
      const countMax = getMax(data, (datum) => {
        return getMax(datum.bins, ({y}) => y);
      });
      domain = [0, countMax];
    } else {
      const yValues = data.map((datum) => {
        switch (this.timeProperty) {
          case TimeProperty.WALL_TIME:
            return datum.wallTime;
          case TimeProperty.STEP:
            return datum.step;
          case TimeProperty.RELATIVE:
            return datum.wallTime - data[0].wallTime;
        }
      });
      const {min: yMin, max: yMax} = getMinMax(yValues, (val) => val);
      domain = [yMin, yMax];
    }
    this.yScale.domain(domain);
  }

  private renderYAxis() {
    const yScale = this.yScale!;
    const {height} = this.host.nativeElement.getBoundingClientRect();
    const overlayAxisHeight = height / 2.5;
    const offsetAxisHeight =
      this.mode === HistogramMode.OFFSET ? height - overlayAxisHeight : 0;
    yScale.range([height - offsetAxisHeight, height]);

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
