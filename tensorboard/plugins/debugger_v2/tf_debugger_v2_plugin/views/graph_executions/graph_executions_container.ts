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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {createSelector, Store} from '@ngrx/store';
import {
  graphExecutionFocused,
  graphExecutionScrollToIndex,
} from '../../actions';
import {
  getFocusedGraphExecutionInputIndices,
  getGraphExecutionData,
  getGraphExecutionFocusIndex,
  getNumGraphExecutions,
} from '../../store';
import {State} from '../../store/debugger_types';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
  selector: 'tf-debugger-v2-graph-executions',
  template: `
    <graph-executions-component
      [numGraphExecutions]="numGraphExecutions()"
      [graphExecutionData]="graphExecutionData()"
      [graphExecutionIndices]="graphExecutionIndices()"
      [focusIndex]="focusIndex()"
      [focusInputIndices]="focusInputIndices()"
      (onScrolledIndexChange)="onScrolledIndexChange($event)"
      (onTensorNameClick)="onTensorNameClick($event)"
    ></graph-executions-component>
  `,
})
export class GraphExecutionsContainer {
  readonly numGraphExecutions;

  readonly graphExecutionData;

  readonly graphExecutionIndices;

  readonly focusIndex;

  /**
   * Inferred graph-execution indices that belong to the immediate inputs
   * to the currently-focused graph op.
   */
  readonly focusInputIndices;

  onScrolledIndexChange(scrolledIndex: number) {
    this.store.dispatch(graphExecutionScrollToIndex({index: scrolledIndex}));
  }

  onTensorNameClick(event: {index: number; graph_id: string; op_name: string}) {
    this.store.dispatch(graphExecutionFocused(event));
  }

  constructor(private readonly store: Store<State>) {
    this.numGraphExecutions = this.store.selectSignal(getNumGraphExecutions);
    this.graphExecutionData = this.store.selectSignal(getGraphExecutionData);
    this.graphExecutionIndices = this.store.selectSignal(
      createSelector(
        getNumGraphExecutions,
        (numGraphExecution: number): number[] | null => {
          if (numGraphExecution === 0) {
            return null;
          }
          return Array.from({length: numGraphExecution}).map((_, i) => i);
        }
      )
    );
    this.focusIndex = this.store.selectSignal(getGraphExecutionFocusIndex);
    this.focusInputIndices = this.store.selectSignal(
      getFocusedGraphExecutionInputIndices
    );
  }
}
