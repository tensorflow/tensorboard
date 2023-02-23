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
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {StepDatum} from '../data_source';
import {RunTag} from '../types';
import {TextState, TEXT_FEATURE_KEY} from './text_types';

const selectTextState = createFeatureSelector<TextState>(TEXT_FEATURE_KEY);

export const getTextRunToTags = createSelector(
  selectTextState,
  (state: TextState) => state.runToTags
);

/**
 * Returns de-duplicated list of <run, tag> tuple for cards that are visible
 * in the UI.
 */
export const getTextAllVisibleRunTags = createSelector(
  selectTextState,
  (state: TextState): RunTag[] => {
    const serializedRunTagTuples = new Set<string>();
    const allVisibleRunTagTuples = new Set<RunTag>();
    for (const runTagTuples of state.visibleRunTags.values()) {
      for (const runTag of runTagTuples) {
        const serializedRunTag = JSON.stringify(runTag);
        if (serializedRunTagTuples.has(serializedRunTag)) {
          continue;
        }
        serializedRunTagTuples.add(serializedRunTag);
        allVisibleRunTagTuples.add(runTag);
      }
    }
    return [...allVisibleRunTagTuples];
  }
);

export const getTextData = createSelector(
  selectTextState,
  (state: TextState, props: {run: string; tag: string}): StepDatum[] | null => {
    // Refactor to `state.data.get(props.run)?.get(props.tag) || null` when prettier
    // supports TypeScript 3.8 (prettier 2.x).
    const tagToSteps = state.data.get(props.run);
    if (!tagToSteps) {
      return null;
    }

    return tagToSteps.get(props.tag) || null;
  }
);
