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

import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {parseDebugTensorValue} from '../../store/debug_tensor_value';
import {GraphExecution} from '../../store/debugger_types';

@Component({
  selector: 'graph-executions-component',
  templateUrl: './graph_executions_component.ng.html',
  styleUrls: ['./graph_executions_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphExecutionsComponent implements OnChanges {
  @Input()
  numGraphExecutions!: number;

  @Input()
  graphExecutionData!: {[index: number]: GraphExecution};

  @Input()
  graphExecutionIndices!: number[];

  @Input()
  focusIndex!: number | null;

  @Output()
  onScrolledIndexChange = new EventEmitter<number>();

  @Output()
  onTensorNameClick = new EventEmitter<{
    graph_id: string;
    op_name: string;
  }>();

  parseDebugTensorValue = parseDebugTensorValue;

  @ViewChild(CdkVirtualScrollViewport, {static: false})
  private readonly viewPort?: CdkVirtualScrollViewport;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.viewPort &&
      changes['focusIndex'] &&
      changes['focusIndex'].currentValue !== null
    ) {
      const range = this.viewPort.getRenderedRange();
      const scrollIndex = changes['focusIndex'].currentValue;
      // Make sure that the index is scrolled to one third the view port.
      // This is nicer than scrolling it merely to the top.
      const thirdRange = Math.round((range.end - range.start) / 3);
      const targetIndex = Math.max(scrollIndex - thirdRange, 0);
      this.viewPort.scrollToIndex(targetIndex);
    }
  }

  TEST_ONLY = {
    getViewPort: () => this.viewPort,
  };
}
