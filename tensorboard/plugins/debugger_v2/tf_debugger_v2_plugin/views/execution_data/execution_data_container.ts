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
import {createSelector, select, Store} from '@ngrx/store';
import {getFocusedExecutionData} from '../../store';
import {Execution, State, TensorDebugMode} from '../../store/debugger_types';
import {DTYPE_ENUM_TO_NAME} from '../../tf_dtypes';

const UNKNOWN_DTYPE_NAME = 'Unknown dtype';

@Component({
  standalone: false,
  selector: 'tf-debugger-v2-execution-data',
  template: `
    <execution-data-component
      [focusedExecutionIndex]="focusedExecutionIndex"
      [focusedExecutionData]="focusedExecutionData$ | async"
      [tensorDebugMode]="tensorDebugMode$ | async"
      [hasDebugTensorValues]="hasDebugTensorValues$ | async"
      [debugTensorValues]="debugTensorValues$ | async"
      [debugTensorDtypes]="debugTensorDtypes$ | async"
    ></execution-data-component>
  `,
})
export class ExecutionDataContainer {
  @Input()
  focusedExecutionIndex!: number;

  readonly focusedExecutionData$;

  readonly tensorDebugMode$;

  readonly hasDebugTensorValues$;

  readonly debugTensorValues$;

  readonly debugTensorDtypes$;

  constructor(private readonly store: Store<State>) {
    this.focusedExecutionData$ = this.store.pipe(
      select(getFocusedExecutionData)
    );
    this.tensorDebugMode$ = this.store.pipe(
      select(
        createSelector(
          getFocusedExecutionData,
          (execution: Execution | null) => {
            if (execution === null) {
              return TensorDebugMode.UNSPECIFIED;
            } else {
              return execution.tensor_debug_mode;
            }
          }
        )
      )
    );
    this.hasDebugTensorValues$ = this.store.pipe(
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
    this.debugTensorValues$ = this.store.pipe(
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
    this.debugTensorDtypes$ = this.store.pipe(
      select(
        createSelector(
          getFocusedExecutionData,
          (execution: Execution | null): string[] | null => {
            if (execution === null || execution.debug_tensor_values === null) {
              return null;
            }
            if (
              execution.tensor_debug_mode !== TensorDebugMode.FULL_HEALTH &&
              execution.tensor_debug_mode !== TensorDebugMode.SHAPE
            ) {
              // TODO(cais): Add logic for other TensorDebugModes with dtype info.
              return null;
            }
            const dtypes: string[] = [];
            for (const tensorValue of execution.debug_tensor_values) {
              if (tensorValue === null) {
                dtypes.push(UNKNOWN_DTYPE_NAME);
              } else {
                const dtypeEnum = String(
                  execution.tensor_debug_mode === TensorDebugMode.FULL_HEALTH
                    ? tensorValue[2] // tensor_debug_mode: FULL_HEALTH
                    : tensorValue[1] // tensor_debug_mode: SHAPE
                );
                dtypes.push(
                  DTYPE_ENUM_TO_NAME[dtypeEnum] || UNKNOWN_DTYPE_NAME
                );
              }
            }
            return dtypes;
          }
        )
      )
    );
  }
}
