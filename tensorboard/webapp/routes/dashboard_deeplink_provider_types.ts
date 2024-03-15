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
import {URLDeserializedState as MetricsURLDeserializedState} from '../metrics/types';
import {URLDeserializedState as RunsURLDeserializedState} from '../runs/types';
import {URLDeserializedState as CoreURLDeserializedState} from '../core/types';

// No need to deserialize the Experimental Plugins as it is immutable and is only read at
// the start of the application.
export type DeserializedState = MetricsURLDeserializedState &
  RunsURLDeserializedState &
  CoreURLDeserializedState;

export const SMOOTHING_KEY = 'smoothing';

export const PINNED_CARDS_KEY = 'pinnedCards';

export const RUN_COLOR_GROUP_KEY = 'runColorGroup';

export const TAG_FILTER_KEY = 'tagFilter';

export const RUN_FILTER_KEY = 'runFilter';
