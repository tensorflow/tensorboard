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
    <div class="dtype-container">
      <span>
        dtype:
      </span>
      <span class="dtype-name">
        {{ dtype }}
      </span>
    </div>
  `,
  styles: [`
    :host {
      background-color: #e3e5e8;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      height: 14px;
      line-height: 14px;
      margin: 0 2px;
      padding: 1px 3px;
      width: max-content;
    }
    .dtype-name {
      font-weight: 600
    }
  `]
})
export class DebugTensorDTypeComponent {
  @Input()
  dtype!: string;
}

@Component({
  selector: 'debug-tensor-rank',
  template: `
    <div>
      {{ rank }}D
    </div>
  `,
  styles: [`
    :host {
      background-color: #e3e5e8;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      height: 14px;
      line-height: 14px;
      margin: 0 2px;
      padding: 1px 3px;
      width: max-content;
    }
  `]
})
export class DebugTensorRankComponent {
  @Input()
  rank!: number;
}

@Component({
  selector: 'debug-tensor-size',
  template: `
    <div>
      <span>
        size:
      </span>
      <span class="size-value">
        {{ size }}
      </span>
    </div>
  `,
  styles: [`
    :host {
      background-color: #e3e5e8;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      height: 14px;
      line-height: 14px;
      margin: 0 2px;
      padding: 1px 3px;
      width: max-content;
    }
  `]
})
export class DebugTensorSizeComponent {
  @Input()
  size!: number;
}

@Component({
  selector: 'graph-executions-component',
  templateUrl: './graph_executions_component.ng.html',
  styleUrls: ['./graph_executions_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphExecutionsComponent {
  @Input()
  numGraphExecutions: number | null = null;

  @Input()
  graphExecutionData: {[index: number]: GraphExecution} = {};

  @Input()
  graphExecutionIndices: number[] | null = null;

  @Output()
  onScrolledIndexChange = new EventEmitter<number>();

  DTYPE_ENUM_TO_NAME = DTYPE_ENUM_TO_NAME;
}
