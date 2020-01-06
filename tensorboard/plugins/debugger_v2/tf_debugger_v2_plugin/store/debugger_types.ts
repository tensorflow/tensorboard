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

import {LoadState} from '../../../../webapp/types/data';

export {DataLoadState, LoadState} from '../../../../webapp/types/data';

export const DEBUGGER_FEATURE_KEY = 'debugger';

export interface DebuggerRunMetadata {
  // Time at which the debugger run started. Seconds since the epoch.
  start_time: number;
}

export interface DebuggerRunListing {
  [runId: string]: DebuggerRunMetadata;
}

export interface DebuggerState {
  // Names of the runs that are available.
  runs: DebuggerRunListing;
  runsLoaded: LoadState;
}

export interface State {
  [DEBUGGER_FEATURE_KEY]: DebuggerState;
}
