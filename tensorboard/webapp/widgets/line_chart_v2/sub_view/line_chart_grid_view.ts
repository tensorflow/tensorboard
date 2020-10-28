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

import {Extent, Scale} from '../lib/public_types';
import {
  getDomX,
  getDomY,
  XDimChartView,
  YDimChartView,
} from './chart_view_utils';
import {AxisView} from './line_chart_axis_view';

@Component({
  selector: 'line-chart-grid-view',
  template: `<svg>
    <line
      *ngFor="let tick of getXTicks()"
      [class.zero]="tick === 0"
      [attr.x1]="getDomX(tick)"
      y1="0"
      [attr.x2]="getDomX(tick)"
      [attr.y2]="domDim.height"
    ></line>
    <line
      *ngFor="let tick of getYTicks()"
      [class.zero]="tick === 0"
      x1="0"
      [attr.y1]="getDomY(tick)"
      [attr.x2]="domDim.width"
      [attr.y2]="getDomY(tick)"
    ></line>
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
        stroke: #ccc;
        stroke-width: 1px;
      }

      .zero {
        stroke: #aaa;
        stroke-width: 1.5px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartGridView
  extends AxisView
  implements XDimChartView, YDimChartView {
  @Input()
  viewExtent!: Extent;

  @Input()
  xScale!: Scale;

  @Input()
  xGridCount!: number;

  @Input()
  yScale!: Scale;

  @Input()
  yGridCount!: number;

  @Input()
  domDim!: {width: number; height: number};

  getDomX(dataX: number): number {
    return getDomX(this, dataX);
  }

  getDomY(dataY: number): number {
    return getDomY(this, dataY);
  }

  getXTicks() {
    return this.getTicks(
      this.xScale,
      this.viewExtent.x,
      this.domDim.width,
      this.xGridCount
    );
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
