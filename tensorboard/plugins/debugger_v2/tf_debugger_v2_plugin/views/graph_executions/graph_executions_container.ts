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

import {graphExecutionScrollToIndex, graphOpFocused} from '../../actions';
import {
  getGraphExecutionData,
  getGraphExecutionFocusIndex,
  getNumGraphExecutions,
} from '../../store';
import {State} from '../../store/debugger_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'tf-debugger-v2-graph-executions',
  template: `
    <graph-executions-component
      [numGraphExecutions]="numGraphExecutions$ | async"
      [graphExecutionData]="graphExecutionData$ | async"
      [graphExecutionIndices]="graphExecutionIndices$ | async"
      [focusIndex]="focusIndex$ | async"
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

  onScrolledIndexChange(scrolledIndex: number) {
    this.store.dispatch(graphExecutionScrollToIndex({index: scrolledIndex}));
  }

  onTensorNameClick(event: {graph_id: string; op_name: string}) {
    this.store.dispatch(graphOpFocused(event));
  }

  constructor(private readonly store: Store<State>) {}
}
