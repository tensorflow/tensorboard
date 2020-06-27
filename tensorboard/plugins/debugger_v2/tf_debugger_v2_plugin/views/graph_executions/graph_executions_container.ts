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
import {Component} from '@angular/core';
import {createSelector, select, Store} from '@ngrx/store';

import {
  graphExecutionFocused,
  graphExecutionScrollToIndex,
  graphOpFocused,
} from '../../actions';
import {
  getFocusedGraphOpInputs,
  getGraphExecutionData,
  getGraphExecutionFocusIndex,
  getNumGraphExecutions,
} from '../../store'; // TODO(cais): Clean up imports. DO NOT SUBMIT.
import {
  State,
  GraphOpInfo,
  GraphOpInputSpec,
  GraphExecution,
} from '../../store/debugger_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'tf-debugger-v2-graph-executions',
  template: `
    <graph-executions-component
      [numGraphExecutions]="numGraphExecutions$ | async"
      [graphExecutionData]="graphExecutionData$ | async"
      [graphExecutionIndices]="graphExecutionIndices$ | async"
      [focusIndex]="focusIndex$ | async"
      [focusInputIndices]="focusInputIndices$ | async"
      (onScrolledIndexChange)="onScrolledIndexChange($event)"
      (onTensorNameClick)="onTensorNameClick($event)"
    ></graph-executions-component>
  `,
})
export class GraphExecutionsContainer {
  readonly numGraphExecutions$ = this.store.pipe(select(getNumGraphExecutions));

  readonly graphExecutionData$ = this.store.pipe(select(getGraphExecutionData));

  readonly graphExecutionIndices$ = this.store.pipe(
    select(
      createSelector(
        getNumGraphExecutions,
        (numGraphExecution: number): number[] | null => {
          if (numGraphExecution === 0) {
            return null;
          }
          return Array.from({length: numGraphExecution}).map((_, i) => i);
        }
      )
    )
  );

  readonly focusIndex$ = this.store.pipe(select(getGraphExecutionFocusIndex));

  /**
   * Inferred graph-execution indices that belong to the immediate inputs
   * to the currently-focused graph op.
   */
  readonly focusInputIndices$ = this.store.pipe(
    select(
      createSelector(
        getGraphExecutionFocusIndex,
        getGraphExecutionData,
        getFocusedGraphOpInputs,
        (
          focusIndex: number | null,
          data: {[index: number]: GraphExecution},
          opInputs: GraphOpInputSpec[] | null
        ): number[] | null => {
          // TODO(cais): This should perhaps be refactored into its own
          // selector.
          if (focusIndex === null || opInputs === null) {
            return null;
          }
          const inputFound: boolean[] = opInputs.map((_) => false);
          const inputIndices: number[] = [];
          const MAX_LOOK_BACK = 1000;
          const limit = Math.max(0, focusIndex - MAX_LOOK_BACK);
          let i = focusIndex - 1;
          for (let i = focusIndex - 1; i >= limit; --i) {
            if (data[i] === undefined) {
              continue;
            }
            for (let j = 0; j < opInputs.length; ++j) {
              if (inputFound[j]) {
                continue;
              }
              if (
                data[i].graph_id === opInputs[j].graph_id &&
                data[i].op_name === opInputs[j].op_name &&
                data[i].output_slot === opInputs[j].output_slot
              ) {
                inputIndices.push(i);
                inputFound[j] = true;
              }
            }
            if (inputFound.every((found) => found)) {
              break;
            }
          }
          return inputIndices;
        }
      )
    )
  );

  onScrolledIndexChange(scrolledIndex: number) {
    this.store.dispatch(graphExecutionScrollToIndex({index: scrolledIndex}));
  }

  onTensorNameClick(event: {index: number; graph_id: string; op_name: string}) {
    this.store.dispatch(
      graphOpFocused({
        graph_id: event.graph_id,
        op_name: event.op_name,
      })
    );
    this.store.dispatch(graphExecutionFocused({index: event.index}));
  }

  constructor(private readonly store: Store<State>) {}
}
