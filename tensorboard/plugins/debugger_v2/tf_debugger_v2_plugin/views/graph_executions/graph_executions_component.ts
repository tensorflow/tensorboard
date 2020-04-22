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

import {GraphExecution} from '../../store/debugger_types';
import {DTYPE_ENUM_TO_NAME} from '../../tf_dtypes';

@Component({
  selector: 'debug-tensor-dtype',
  template: `
    <span class="dtype-name">{{ dtype }}</span>
  `,
  styles: [
    `
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
      .dtype-name {
        font-weight: 600;
      }
    `,
  ],
})
export class DebugTensorDTypeComponent {
  @Input()
  dtype!: string;
}

@Component({
  selector: 'debug-tensor-rank',
  template: `
    {{ rank }}D
  `,
  styles: [
    `
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
    `,
  ],
})
export class DebugTensorRankComponent {
  @Input()
  rank!: number;
}

// @Component({
//   selector: 'debug-tensor-size',
//   template: `

//   `,
//   styles: [`
//     :host {
//       background-color: #e3e5e8;
//       border: 1px solid #c0c0c0;
//       border-radius: 4px;
//       font-family: 'Roboto Mono', monospace;
//       height: 14px;
//       line-height: 14px;
//       margin: 0 2px;
//       padding: 1px 3px;
//       width: max-content;
//     }
//   `]
// })
// export class DebugTensorSizeComponent {
//   @Input()
// }

@Component({
  selector: 'debug-tensor-numeric-breakdown',
  template: `
    <div class="size">
      <span>size:</span>
      <span class="size-value">{{ size }}</span>
    </div>
    <div class="break"></div>
    <div class="breakdown">
      <div *ngIf="numNaNs !== undefined && numNaNs > 0" class="category">
        <span class="category-tag infinite">NaN</span>
        <span>×{{ numNaNs }}</span>
      </div>
      <div
        *ngIf="numNegativeInfs !== undefined && numNegativeInfs > 0"
        class="category"
      >
        <span class="category-tag infinite">-∞</span>
        <span>×{{ numNegativeInfs }}</span>
      </div>
      <div
        *ngIf="numPositiveInfs !== undefined && numPositiveInfs > 0"
        class="category"
      >
        <span class="category-tag infinite">+∞</span>
        <span>×{{ numPositiveInfs }}</span>
      </div>
      <div
        *ngIf="numNegativeFinites !== undefined && numNegativeFinites > 0"
        class="category"
      >
        <span class="category-tag finite">-</span>
        <span>×{{ numNegativeFinites }}</span>
      </div>
      <div *ngIf="numZeros !== undefined && numZeros > 0" class="category">
        <span class="category-tag finite">0</span>
        <span>×{{ numZeros }}</span>
      </div>
      <div
        *ngIf="numPositiveFinites !== undefined && numPositiveFinites > 0"
        class="category"
      >
        <span class="category-tag finite">+</span>
        <span>×{{ numPositiveFinites }}</span>
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
        height: 28px;
        line-height: 28px;
        padding: 0 2px;
        width: max-content;
      }
      .break {
        flex-basis: 100%;
        width: 0;
      }
      .size {
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        display: block;
        height: 12px;
        line-height: 12px;
        margin: 0 3px;
        vertical-align: middle;
      }
      .breakdown {
        display: flex;
        height: 12px;
        line-height: 12px;
        padding: 0 2px;
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
  numNaNs: number | undefined;
  // TODO(cais): Colorize.

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
}

// export class DebugValueComponent {
//   @Input()
//   tensor_debug_mode: number;

//   @Input()
//   debug_tensor_value: number[];
// }

@Component({
  selector: 'graph-executions-component',
  templateUrl: './graph_executions_component.ng.html',
  styleUrls: ['./graph_executions_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphExecutionsComponent {
  @Input()
  numGraphExecutions!: number;

  @Input()
  graphExecutionData!: {[index: number]: GraphExecution};

  @Input()
  graphExecutionIndices!: number[];

  @Output()
  onScrolledIndexChange = new EventEmitter<number>();

  DTYPE_ENUM_TO_NAME = DTYPE_ENUM_TO_NAME;
}
