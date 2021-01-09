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

import {StepDatum} from '../data_source';
import {TextState, TEXT_FEATURE_KEY} from './text_types';

type RunId = string;
type TagId = string;

export function buildTextState(override: Partial<TextState>): TextState {
  return {
    runToTags: new Map<RunId, TagId[]>(),
    data: new Map<RunId, Map<TagId, StepDatum[]>>(),
    visibleRunTags: new Map<string, Array<{run: string; tag: string}>>(),
    ...override,
  };
}

export function buildState(textState: TextState) {
  return {
    [TEXT_FEATURE_KEY]: textState,
  };
}
