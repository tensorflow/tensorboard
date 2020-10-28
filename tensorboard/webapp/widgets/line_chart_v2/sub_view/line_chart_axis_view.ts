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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

import {Dimension, Extent, Scale} from '../lib/public_types';
import {formatAxisNumber} from './axis_formatter';
import {
  getDomX,
  getDomY,
  XDimChartView,
  YDimChartView,
} from './chart_view_utils';

export abstract class AxisView {
  trackByTick(index: number, tick: number) {
    return tick;
  }

  getTickString(tick: number): string {
    return formatAxisNumber(tick);
  }

  private getDomSizeInformedTickCount(
    domSize: number,
    tickCount: number
  ): number {
    const guidance = Math.floor(domSize / 50);
    return Math.min(guidance, tickCount);
  }

  protected getTicks(
    scale: Scale,
    domain: [number, number],
    domSize: number,
    preferredCount: number
  ): number[] {
    return scale.ticks(
      domain,
      this.getDomSizeInformedTickCount(domSize, preferredCount)
    );
  }
}

const AXIS_COMMON_STYLES = `
  :host {
    display: block;
    overflow: hidden;
  }

  svg {
    height: 100%;
    width: 100%;
  }

  line {
    stroke: #333;
    stroke-width: 1px;
  }

  text {
    font-size: 11px;
    user-select: none;
  }
`;

@Component({
  selector: 'line-chart-x-axis',
  template: `<svg>
    <line x1="0" y1="0" [attr.x2]="domDim.width" y2="0"></line>
    <ng-container *ngFor="let tick of getXTicks(); trackBy: trackByTick">
      <g>
        <text [attr.x]="getDomX(tick)" [attr.y]="5">
          {{ getTickString(tick) }}
        </text>
        <title>{{ tick }}</title>
      </g>
    </ng-container>
  </svg>`,
  styles: [
    AXIS_COMMON_STYLES,
    `
      text {
        dominant-baseline: hanging;
        text-anchor: middle;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartXAxisComponent extends AxisView implements XDimChartView {
  @Input()
  viewExtent!: Extent;

  @Input()
  xScale!: Scale;

  @Input()
  xGridCount!: number;

  @Input()
  domDim!: Dimension;

  getDomX(data: number): number {
    return getDomX(this, data);
  }

  getXTicks() {
    return this.getTicks(
      this.xScale,
      this.viewExtent.x,
      this.domDim.width,
      this.xGridCount
    );
  }
}

@Component({
  selector: 'line-chart-y-axis',
  template: `<svg>
    <line
      [attr.x1]="domDim.width"
      y1="0"
      [attr.x2]="domDim.width"
      [attr.y2]="domDim.height"
    ></line>
    <ng-container *ngFor="let tick of getYTicks(); trackBy: trackByTick">
      <g>
        <text [attr.x]="domDim.width - 5" [attr.y]="getDomY(tick)">
          {{ getTickString(tick) }}
        </text>
        <title>{{ tick }}</title>
      </g>
    </ng-container>
  </svg>`,
  styles: [
    AXIS_COMMON_STYLES,
    `
      text {
        dominant-baseline: central;
        text-anchor: end;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartYAxisComponent extends AxisView implements YDimChartView {
  @Input()
  viewExtent!: Extent;

  @Input()
  yScale!: Scale;

  @Input()
  yGridCount!: number;

  @Input()
  domDim!: Dimension;

  getDomY(data: number): number {
    return getDomY(this, data);
  }

  getYTicks() {
    return this.getTicks(
      this.yScale,
      this.viewExtent.y,
      this.domDim.height,
      this.yGridCount
    );
  }
}
