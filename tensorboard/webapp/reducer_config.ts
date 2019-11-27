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
import {InjectionToken, isDevMode} from '@angular/core';
import {
  Action,
  ActionReducer,
  ActionReducerMap,
  MetaReducer,
} from '@ngrx/store';

import {storeLogger} from 'ngrx-store-logger';

export interface State {}

export function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  // We must call isDevMode() within this function, not at file load time,
  // because of load ordering issues vs. the config/bootstrap setup.

  // TODO(stephanwlee, davidsoergel): Why is this called twice?
  console.log(
    isDevMode() ? 'DEV mode: Logger enabled' : 'PROD mode: Logger disabled'
  );
  return isDevMode() ? storeLogger()(reducer) : reducer;
}

// TODO(stephanwlee, davidsoergel): consider injecting metareducers via
// https://ngrx.io/guide/store/recipes/injecting#injecting-meta-reducers
export const metaReducers: MetaReducer<any>[] = [logger];

export const ROOT_REDUCERS = new InjectionToken<
  ActionReducerMap<State, Action>
>('Root reducers token', {
  factory: () => ({}),
});
