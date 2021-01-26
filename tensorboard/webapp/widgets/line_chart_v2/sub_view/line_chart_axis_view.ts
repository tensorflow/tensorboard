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
  HostBinding,
  Input,
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
  template: `
    <div [class]="axis + '-axis'">
      <svg class="minor">
        <ng-container *ngIf="axis === 'x'; else yAxisLine">
          <line x1="0" y1="0" [attr.x2]="domDim.width" y2="0"></line>
        </ng-container>
        <ng-template #yAxisLine>
          <line
            [attr.x1]="domDim.width"
            y1="0"
            [attr.x2]="domDim.width"
            [attr.y2]="domDim.height"
          ></line>
        </ng-template>
        <ng-container *ngFor="let tick of getTicks()">
          <g *ngIf="shouldShowMinorTick(tick, axis)">
            <text [attr.x]="textXPosition(tick)" [attr.y]="textYPosition(tick)">
              {{ getFormatter().formatTick(tick) }}
            </text>
            <title>
              {{ getFormatter().formatReadable(tick) }}
            </title>
          </g>
        </ng-container>
      </svg>
      <svg *ngIf="shouldShowMajorTicks()" class="major">
        <g *ngFor="let tick of getMajorTicks()">
          <text [attr.x]="textXPosition(tick)" [attr.y]="textYPosition(tick)">
            {{ getFormatter().formatShort(tick) }}
          </text>
          <title>
            {{ getFormatter().formatReadable(tick) }}
          </title>
        </g>
      </svg>
    </div>
  `,
  styles: [
    `
      :host {
        contain: strict;
        display: flex;
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

      .x-axis,
      .y-axis {
        height: 100%;
        width: 100%;
      }

      .x-axis {
        flex-direction: column;
      }

      .x-axis text {
        dominant-baseline: hanging;
        text-anchor: middle;
      }

      .y-axis {
        flex-direction: row;
      }

      .y-axis text {
        dominant-baseline: central;
        text-anchor: end;
      }
    `,
  ],
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

  shouldShowMinorTick(tick: number, axis: 'x' | 'y'): boolean {
    // Hide the tick text when it is too close to the left/right edge.
    const fractionOfFullExtent =
      (tick - this.axisExtent[0]) / (this.axisExtent[1] - this.axisExtent[0]);
    const margin = axis === 'x' ? 0.075 : 0.03;
    if (fractionOfFullExtent < margin || fractionOfFullExtent > 1 - margin) {
      return false;
    }
    return true;
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
}
