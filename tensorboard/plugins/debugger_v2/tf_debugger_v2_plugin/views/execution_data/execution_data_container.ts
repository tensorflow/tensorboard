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
import {select, Store, createSelector} from '@ngrx/store';

import {Execution, State, TensorDebugMode} from '../../store/debugger_types';

import {
  getActiveRunId,
  getFocusedExecutionData,
  getFocusedExecutionIndex,
} from '../../store';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'tf-debugger-v2-execution-data',
  template: `
    <execution-data-component
      [activeRunId]="activeRunId$ | async"
      [focusedExecutionIndex]="focusedExecutionIndex$ | async"
      [focusedExecutionData]="focusedExecutionData$ | async"
      [tensorDebugModeName]="tensorDebugModeName$ | async"
      [anyDebugTensorValues]="anyDebugTensorValues$ | async"
      [debugTensorValues]="debugTensorValues$ | async"
    ></execution-data-component>
  `,
})
export class ExecutionDataContainer {
  readonly activeRunId$ = this.store.pipe(select(getActiveRunId));

  readonly focusedExecutionIndex$ = this.store.pipe(
    select(getFocusedExecutionIndex)
  );

  readonly focusedExecutionData$ = this.store.pipe(
    select(getFocusedExecutionData)
  );

  readonly tensorDebugModeName$ = this.store.pipe(
    select(
      createSelector(
        getFocusedExecutionData,
        (execution: Execution | null) => {
          if (execution === null) {
            return '';
          } else {
            return TensorDebugMode[execution.tensor_debug_mode];
          }
        }
      )
    )
  );

  readonly anyDebugTensorValues$ = this.store.pipe(
    select(
      createSelector(
        getFocusedExecutionData,
        (execution: Execution | null) => {
          if (execution === null || execution.debug_tensor_values === null) {
            return false;
          } else {
            for (const singleDebugTensorValues of execution.debug_tensor_values) {
              if (
                singleDebugTensorValues !== null &&
                singleDebugTensorValues.length > 0
              ) {
                return true;
              }
            }
            return false;
          }
        }
      )
    )
  );

  readonly debugTensorValues$ = this.store.pipe(
    select(
      createSelector(
        getFocusedExecutionData,
        (execution: Execution | null) => {
          if (execution === null) {
            return null;
          } else {
            return execution.debug_tensor_values;
          }
        }
      )
    )
  );

  constructor(private readonly store: Store<State>) {}
}
