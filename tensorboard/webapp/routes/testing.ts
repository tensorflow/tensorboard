/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {DeserializedState} from './dashboard_deeplink_provider_types';

export function buildDeserializedState(
  override: Partial<DeserializedState> = {}
) {
  return {
    unknownQueryParams: {},
    runs: {
      groupBy: null,
      regexFilter: null,
    },
    metrics: {
      pinnedCards: [],
      smoothing: null,
      tagFilter: null,
    },
    ...override,
  };
}
