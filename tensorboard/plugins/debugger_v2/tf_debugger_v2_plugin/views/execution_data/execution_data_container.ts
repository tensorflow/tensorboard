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
import {select, Store} from '@ngrx/store';

import {State} from '../../store/debugger_types';

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
    ></execution-data-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutionDataContainer {
  readonly activeRunId$ = this.store.pipe(select(getActiveRunId));

  readonly focusedExecutionIndex$ = this.store.pipe(
    select(getFocusedExecutionIndex)
  );

  readonly focusedExecutionData$ = this.store.pipe(
    select(getFocusedExecutionData)
  );

  constructor(private readonly store: Store<State>) {}
}
