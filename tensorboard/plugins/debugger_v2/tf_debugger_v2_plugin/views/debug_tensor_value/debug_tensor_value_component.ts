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
import {Component, Input} from '@angular/core';
import {DebugTensorValue} from '../../store/debugger_types';

const basicDebugInfoStyle = `
  :host {
    background-color: #e3e5e8;
    border: 1px solid #c0c0c0;
    border-radius: 4px;
    font-family: 'Roboto Mono', monospace;
    height: 14px;
    line-height: 14px;
    margin: 0 2px;
    padding: 1px 3px;
    width: max-content;
  }
`;

@Component({
  standalone: false,
  selector: 'debug-tensor-dtype',
  template: ` {{ dtype }} `,
  styles: [basicDebugInfoStyle],
})
export class DebugTensorDTypeComponent {
  @Input()
  dtype!: string;
}

@Component({
  standalone: false,
  selector: 'debug-tensor-rank',
  template: ` {{ rank }}D `,
  styles: [basicDebugInfoStyle],
})
export class DebugTensorRankComponent {
  @Input()
  rank!: number;
}

@Component({
  standalone: false,
  selector: 'debug-tensor-shape',
  template: ` shape:{{ shapeString }} `,
  styles: [basicDebugInfoStyle],
})
export class DebugTensorShapeComponent {
  @Input()
  shape!: Array<number | undefined>;

  get shapeString(): string {
    return (
      '[' +
      this.shape
        .map((dim) => {
          return dim === undefined ? '?' : String(dim);
        })
        .join(',') +
      ']'
    );
  }
}

@Component({
  standalone: false,
  selector: 'debug-tensor-numeric-breakdown',
  template: `
    <div class="size">
      <span>size:</span>
      <span class="size-value">{{ size }}</span>
    </div>
    <div *ngIf="breakdownExists" class="break"></div>
    <div *ngIf="breakdownExists" class="breakdown">
      <div *ngIf="numNaNs !== undefined && numNaNs > 0" class="category">
        <span class="category-tag infinite">NaN</span>
        <span class="category-count">×{{ numNaNs }}</span>
      </div>
      <div
        *ngIf="numNegativeInfs !== undefined && numNegativeInfs > 0"
        class="category"
      >
        <span class="category-tag infinite">-∞</span>
        <span class="category-count">×{{ numNegativeInfs }}</span>
      </div>
      <div
        *ngIf="numPositiveInfs !== undefined && numPositiveInfs > 0"
        class="category"
      >
        <span class="category-tag infinite">+∞</span>
        <span class="category-count">×{{ numPositiveInfs }}</span>
      </div>
      <div
        *ngIf="numNegativeFinites !== undefined && numNegativeFinites > 0"
        class="category"
      >
        <span class="category-tag finite">-</span>
        <span class="category-count">×{{ numNegativeFinites }}</span>
      </div>
      <div *ngIf="numZeros !== undefined && numZeros > 0" class="category">
        <span class="category-tag finite">0</span>
        <span class="category-count">×{{ numZeros }}</span>
      </div>
      <div
        *ngIf="numPositiveFinites !== undefined && numPositiveFinites > 0"
        class="category"
      >
        <span class="category-tag finite">+</span>
        <span class="category-count">×{{ numPositiveFinites }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        background-color: #e3e5e8;
        border: 1px solid #c0c0c0;
        border-radius: 4px;
        font-family: 'Roboto Mono', monospace;
        font-size: 10px;
        margin: 0 2px;
        padding: 1px;
      }
      .break {
        flex-basis: 100%;
        width: 0;
      }
      .size {
        display: block;
        height: 11px;
        line-height: 11px;
        margin: 0 3px;
        vertical-align: middle;
      }
      .breakdown {
        border-top: 1px solid rgba(0, 0, 0, 0.12);
        display: flex;
        height: 11px;
        line-height: 11px;
        padding: 2px;
        vertical-align: middle;
      }
      .category {
        margin-bottom: 2px;
        margin-left: 4px;
        margin-top: 2px;
        heigth: 100%;
        width: max-content;
      }
      .category-tag {
        border-radius: 2px;
        padding: 0 2px;
      }
      .finite {
        background-color: #aaa;
        color: #fefefe;
      }
      .infinite {
        background-color: #e52592;
        color: #fff;
      }
    `,
  ],
})
export class DebugTensorNumericBreakdownComponent {
  @Input()
  size!: number;

  @Input()
  numNaNs!: number | undefined;

  @Input()
  numNegativeInfs: number | undefined;

  @Input()
  numPositiveInfs: number | undefined;

  @Input()
  numNegativeFinites: number | undefined;

  @Input()
  numZeros: number | undefined;

  @Input()
  numPositiveFinites: number | undefined;

  get breakdownExists(): boolean {
    return (
      this.numNaNs !== undefined ||
      this.numNegativeInfs !== undefined ||
      this.numPositiveInfs !== undefined ||
      this.numNegativeFinites !== undefined ||
      this.numZeros !== undefined ||
      this.numPositiveFinites !== undefined
    );
  }
}

@Component({
  standalone: false,
  selector: 'debug-tensor-has-inf-or-nan',
  template: `
    <div [ngClass]="['container', hasInfOrNaN ? 'has-inf-or-nan' : '']">
      {{ infoString }}
    </div>
  `,
  styles: [
    `
      .container {
        background-color: #e3e5e8;
        border: 1px solid #c0c0c0;
        border-radius: 4px;
        color: #666666;
        font-family: 'Roboto Mono', monospace;
        height: 14px;
        line-height: 14px;
        margin: 0 2px;
        padding: 1px 3px;
        width: max-content;
      }
      .has-inf-or-nan {
        background-color: #e52592;
        color: #fff;
      }
    `,
  ],
})
export class DebugTensorHasInfOrNaNComponent {
  @Input()
  hasInfOrNaN!: boolean;

  get infoString(): string {
    return this.hasInfOrNaN ? 'Has ∞/NaN' : 'No ∞/NaN';
  }
}

@Component({
  standalone: false,
  selector: 'debug-tensor-value',
  template: `
    <debug-tensor-dtype
      *ngIf="debugTensorValue.dtype !== undefined"
      [dtype]="debugTensorValue.dtype"
    >
    </debug-tensor-dtype>
    <debug-tensor-rank
      *ngIf="debugTensorValue.rank !== undefined"
      [rank]="debugTensorValue.rank"
    >
    </debug-tensor-rank>
    <debug-tensor-shape
      *ngIf="debugTensorValue.shape !== undefined"
      [shape]="debugTensorValue.shape"
    >
    </debug-tensor-shape>
    <debug-tensor-has-inf-or-nan
      *ngIf="debugTensorValue.hasInfOrNaN !== undefined"
      [hasInfOrNaN]="debugTensorValue.hasInfOrNaN"
    >
    </debug-tensor-has-inf-or-nan>
    <debug-tensor-numeric-breakdown
      *ngIf="debugTensorValue.size !== undefined"
      size="{{ debugTensorValue.size }}"
      [numNegativeInfs]="debugTensorValue.numNegativeInfs"
      [numPositiveInfs]="debugTensorValue.numPositiveInfs"
      [numNaNs]="debugTensorValue.numNaNs"
      [numNegativeFinites]="debugTensorValue.numNegativeFinites"
      [numZeros]="debugTensorValue.numZeros"
      [numPositiveFinites]="debugTensorValue.numPositiveFinites"
    >
    </debug-tensor-numeric-breakdown>
  `,
  styles: [
    `
      :host {
        align-items: flex-start;
        display: flex;
        flex-wrap: nowrap;
        overflow: hidden;
        vertical-align: top;
      }
      debug-tensor-numeric-breakdown {
        display: inline-block;
      }
    `,
  ],
})
export class DebugTensorValueComponent {
  @Input()
  debugTensorValue!: DebugTensorValue;
}
