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
import {GraphExecution} from '../../store/debugger_types';
import {parseDebugTensorValue} from '../../store/debug_tensor_value';

@Component({
  standalone: false,
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

  /**
   * The input tensors of the currently-focused tensor (graph execution event).
   * If no graph execution is focused, the value is `null`.
   * If the currently-focusd tensor has no inputs, the value is `[]`.
   */
  @Input()
  focusInputIndices!: number[] | null;

  @Output()
  onScrolledIndexChange = new EventEmitter<number>();

  @Output()
  onTensorNameClick = new EventEmitter<{
    index: number;
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
      const useSmoothScrolling =
        scrollIndex >= range.start && scrollIndex < range.end;
      this.viewPort.scrollToIndex(
        targetIndex,
        useSmoothScrolling ? 'smooth' : undefined
      );
    }
  }

  getTensorName(graphExecutionIndex: number): string {
    return (
      `${this.graphExecutionData[graphExecutionIndex].op_name}:` +
      `${this.graphExecutionData[graphExecutionIndex].output_slot}`
    );
  }

  /**
   * Computes if given graph-execution index is an immediate input tensor to
   * the graph execution currently focused on.
   *
   * @param graphExecutionIndex
   * @returns If no graph execution is focused on, `false`. If a graph execution
   *   is being focused on, `true` if `graphExecutionIndex` points to a graph-
   *   execution event that forms the immediate input to the focused one.
   */
  isInputOfFocus(graphExecutionIndex: number): boolean {
    if (this.focusInputIndices === null) {
      return false;
    }
    return this.focusInputIndices.includes(graphExecutionIndex);
  }

  TEST_ONLY = {
    getViewPort: () => this.viewPort,
  };
}
