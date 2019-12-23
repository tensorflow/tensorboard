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

import {createAction, props} from '@ngrx/store';

import {DebuggerRunListing} from '../store/debugger_types';

// HACK: Below import is for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

/**
 * Actions for Debugger V2.
 */

/**
 * Actions for the Debugger Component.
 */
export const debuggerLoaded = createAction('[Debugger] Debugger Loaded');

export const debuggerRunsRequested = createAction(
  '[Debugger] Debugger Runs Requested'
);

export const debuggerRunsLoaded = createAction(
  '[Debugger] Debugger Runs Loaded',
  props<{runs: DebuggerRunListing}>()
);

export const debuggerRunsRequestFailed = createAction(
  '[Debugger] Debugger Runs Request Failed'
);

/**
 * Actions for the Alerts Component.
 */
export const alertsViewLoaded = createAction('[Alerts] Alerts View Loaded');
