/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

import {Component, NgModule} from '@angular/core';
import {Store} from '@ngrx/store';

import {
  DataLoadState,
  DEBUGGER_FEATURE_KEY,
  DebuggerState,
  State,
} from '../store/debugger_types';

export function createDebuggerState(
  override?: Partial<DebuggerState>
): DebuggerState {
  return {
    runs: {},
    runsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    ...override,
  };
}

export function createState(debuggerState: DebuggerState): State {
  return {[DEBUGGER_FEATURE_KEY]: debuggerState};
}

// Below are minimalist Angular contains and modules only for testing. They
// serve to decouple the details of Debugger from the testing of outside modules
// that use it.

@Component({
  selector: 'tf-debugger-v2',
  template: ``,
})
export class TestingDebuggerContainer {
  constructor(private readonly store: Store<{}>) {}
}

@NgModule({
  declarations: [TestingDebuggerContainer],
  exports: [TestingDebuggerContainer],
})
export class TestingDebuggerModule {}
