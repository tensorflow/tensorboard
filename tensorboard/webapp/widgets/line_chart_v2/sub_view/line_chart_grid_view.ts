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
  getDomSizeInformedTickCount,
  getScaleRangeFromDomDim,
} from './chart_view_utils';

@Component({
  standalone: false,
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
        display: flex;
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
export class LineChartGridView {
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
    return this.xScale.forward(
      this.viewExtent.x,
      getScaleRangeFromDomDim(this.domDim, 'x'),
      dataX
    );
  }

  getDomY(dataY: number): number {
    return this.yScale.forward(
      this.viewExtent.y,
      getScaleRangeFromDomDim(this.domDim, 'y'),
      dataY
    );
  }

  getXTicks() {
    return this.xScale.ticks(
      this.viewExtent.x,
      getDomSizeInformedTickCount(this.domDim.width, this.xGridCount)
    );
  }

  getYTicks() {
    return this.yScale.ticks(
      this.viewExtent.y,
      getDomSizeInformedTickCount(this.domDim.height, this.yGridCount)
    );
  }
}
