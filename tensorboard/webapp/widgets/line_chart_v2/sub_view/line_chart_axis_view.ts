/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {Dimension, Formatter, Scale} from '../lib/public_types';
import {TemporalScale} from '../lib/scale';
import {
  getDomSizeInformedTickCount,
  getScaleRangeFromDomDim,
} from './chart_view_utils';

const DAY_IN_MS = 24 * 1000 * 60 * 60;

@Component({
  selector: 'line-chart-axis',
  templateUrl: 'line_chart_axis_view.ng.html',
  styleUrls: ['line_chart_axis_view.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartAxisComponent {
  @Input()
  axisExtent!: [number, number];

  @Input()
  axis!: 'x' | 'y';

  @Input()
  scale!: Scale;

  @Input()
  gridCount!: number;

  @Input()
  domDim!: Dimension;

  @Input()
  customFormatter?: Formatter;

  @Output()
  onViewExtentChange = new EventEmitter<[number, number]>();

  getFormatter(): Formatter {
    return this.customFormatter ?? this.scale.defaultFormatter;
  }

  /**
   * Returns true if the major ticks must be shown.
   *
   * Major tick is required for temporal axis since tick string do not have sufficient
   * information alone and is hard to fit time information without a major ticks.
   */
  shouldShowMajorTicks(): boolean {
    const majorTickCount = this.getMajorTicks().length;
    const minorTickCount = this.getTicks().length;

    return (
      this.scale instanceof TemporalScale &&
      this.axisExtent[1] - this.axisExtent[0] < DAY_IN_MS &&
      minorTickCount > majorTickCount &&
      majorTickCount <= 2
    );
  }

  getMajorTicks(): number[] {
    return this.scale.ticks(this.axisExtent, 2);
  }

  getTicks(): number[] {
    const domSize = this.axis === 'x' ? this.domDim.width : this.domDim.height;
    const maxTickSize = getDomSizeInformedTickCount(domSize, this.gridCount);
    return this.scale.ticks(this.axisExtent, maxTickSize);
  }

  private getDomPos(data: number): number {
    return this.scale.forward(
      this.axisExtent,
      getScaleRangeFromDomDim(this.domDim, this.axis),
      data
    );
  }

  private static readonly TEXT_PADDING = 5;

  textXPosition(tick: number) {
    return this.axis === 'x'
      ? this.getDomPos(tick)
      : this.domDim.width - LineChartAxisComponent.TEXT_PADDING;
  }

  textYPosition(tick: number) {
    return this.axis === 'x'
      ? LineChartAxisComponent.TEXT_PADDING
      : this.getDomPos(tick);
  }

  keydownPreventClose(event: KeyboardEvent) {
    if (event.key !== 'Escape') {
      event.stopPropagation();
    }
  }

  extentChanged(minValue: string, maxValue: string) {
    let min = Number(minValue);
    let max = Number(maxValue);

    if (max < min) {
      const temp = min;
      min = max;
      max = temp;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    this.onViewExtentChange.emit([min, max]);
  }

  onAxisUpdateMenuOpen(
    minInput: HTMLInputElement,
    maxInput: HTMLInputElement,
    axisExtent: [number, number]
  ): void {
    minInput.value = String(axisExtent[0]);
    maxInput.value = String(axisExtent[1]);
    minInput.focus();
  }
}
