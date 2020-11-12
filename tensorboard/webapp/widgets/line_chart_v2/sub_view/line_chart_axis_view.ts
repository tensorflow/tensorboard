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

import {Dimension, Scale} from '../lib/public_types';
import {formatAxisNumber} from './axis_formatter';
import {
  getDomSizeInformedTickCount,
  getScaleRangeFromDomDim,
} from './chart_view_utils';

@Component({
  selector: 'line-chart-axis',
  template: `<svg [ngClass]="axis">
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
      <g>
        <text [attr.x]="textXPosition(tick)" [attr.y]="textYPosition(tick)">
          {{ getTickString(tick) }}
        </text>
        <title>{{ tick }}</title>
      </g>
    </ng-container>
  </svg>`,
  styles: [
    `
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

      svg.x text {
        dominant-baseline: hanging;
        text-anchor: middle;
      }

      svg.y text {
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

  getTicks(): number[] {
    const domSize = this.axis === 'x' ? this.domDim.width : this.domDim.height;
    return this.scale.ticks(
      this.axisExtent,
      getDomSizeInformedTickCount(domSize, this.gridCount)
    );
  }

  getTickString(tick: number): string {
    return formatAxisNumber(tick);
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
