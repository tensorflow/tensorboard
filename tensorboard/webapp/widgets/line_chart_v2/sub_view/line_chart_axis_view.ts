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
import {LinearScale, TemporalScale} from '../lib/scale';
import {
  getDomSizeInformedTickCount,
  getScaleRangeFromDomDim,
} from './chart_view_utils';
import {
  getTicksForLinearScale,
  MajorTick,
  MinorTick,
} from './line_chart_axis_utils';

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

  editMenuOpened = false;

  majorTicks: MajorTick[] = [];
  minorTicks: MinorTick[] = [];

  ngOnChanges() {
    if (this.scale instanceof LinearScale) {
      const domSize =
        this.axis === 'x' ? this.domDim.width : this.domDim.height;
      const maxTickSize = getDomSizeInformedTickCount(domSize, this.gridCount);
      const {major, minor} = getTicksForLinearScale(
        this.scale,
        this.getFormatter(),
        maxTickSize,
        this.axisExtent[0],
        this.axisExtent[1]
      );
      this.majorTicks = major;
      this.minorTicks = minor;
    } else {
      const {major, minor} = this.getMajorMinorTicks();
      this.majorTicks = major;
      this.minorTicks = minor;
    }
  }

  getFormatter(): Formatter {
    return this.customFormatter ?? this.scale.defaultFormatter;
  }

  trackByMinorTick(tick: MinorTick): number {
    return tick.value;
  }

  trackByMajorTick(tick: MajorTick): number {
    return tick.start;
  }

  private getMajorTickValues(): number[] {
    if (this.scale instanceof TemporalScale) {
      const majorTicks = this.scale.ticks(this.axisExtent, 2);
      if (
        this.axisExtent[1] - this.axisExtent[0] < DAY_IN_MS &&
        majorTicks.length <= 2
      ) {
        return majorTicks;
      }
    }

    return [];
  }

  private getMajorMinorTicks(): {major: MajorTick[]; minor: MinorTick[]} {
    const formatter = this.getFormatter();
    const domSize = this.axis === 'x' ? this.domDim.width : this.domDim.height;
    const maxTickSize = getDomSizeInformedTickCount(domSize, this.gridCount);
    const minorTicks: MinorTick[] = [];
    for (const tickValue of this.scale.ticks(this.axisExtent, maxTickSize)) {
      minorTicks.push({
        tickFormattedString: formatter.formatTick(tickValue),
        value: tickValue,
      });
    }

    const majorTicks: MajorTick[] = [];
    for (const tickValue of this.getMajorTickValues()) {
      majorTicks.push({
        tickFormattedString: formatter.formatShort(tickValue),
        start: tickValue,
      });
    }

    return {major: majorTicks, minor: minorTicks};
  }

  private getDomPos(data: number): number {
    return this.scale.forward(
      this.axisExtent,
      getScaleRangeFromDomDim(this.domDim, this.axis),
      data
    );
  }

  textXPosition(tick: number): string {
    return this.axis === 'x' ? String(this.getDomPos(tick)) : '100%';
  }

  textYPosition(tick: number): string {
    return this.axis === 'x' ? '' : String(this.getDomPos(tick));
  }

  getMajorXPosition(tick: MajorTick): number {
    if (this.axis === 'y') return 0;

    return Math.min(this.domDim.width, Math.max(0, this.getDomPos(tick.start)));
  }

  getMajorWidthString(
    tick: MajorTick,
    isLast: boolean,
    nextTick?: MajorTick
  ): string {
    if (this.axis === 'y') return '';

    return (
      (isLast || !nextTick
        ? this.domDim.width
        : this.getMajorXPosition(nextTick)) -
      this.getMajorXPosition(tick) +
      'px'
    );
  }

  getMajorYPosition(tick: MajorTick): number {
    if (this.axis === 'x') return 0;

    return (
      this.domDim.height -
      Math.min(this.domDim.height, Math.max(0, this.getDomPos(tick.start)))
    );
  }

  getMajorHeightString(
    tick: MajorTick,
    isLast: boolean,
    nextTick?: MajorTick
  ): string {
    if (this.axis === 'x') return '';

    return (
      (isLast || !nextTick
        ? this.domDim.height
        : this.getMajorYPosition(nextTick)) -
      this.getMajorYPosition(tick) +
      'px'
    );
  }

  keydownPreventClose(event: KeyboardEvent) {
    // Any keydown or interaction inside mat-menu automatically closes the menu
    // which is not what we want. Stop the propoagation and do not let mat-menu
    // know about any keydowns except for `Escape`.
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

  setEditMenuOpened(opened: boolean): void {
    this.editMenuOpened = opened;
  }
}
