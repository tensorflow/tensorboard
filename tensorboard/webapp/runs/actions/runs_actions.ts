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
/**
 * @fileoverview Experiments Ngrx actions.
 */

import {createAction, props} from '@ngrx/store';
import {SortDirection} from '../../types/ui';
import {Run} from '../data_source/runs_data_source_types';
import {ExperimentIdToRunsAndMetadata, GroupBy, SortKey} from '../types';

/**
 * The action can fire when no requests are actually made (i.e., an empty
 * requestedExperimentIds).
 */
export const fetchRunsRequested = createAction(
  '[Runs] Fetch Runs Requested',
  props<{experimentIds: string[]; requestedExperimentIds: string[]}>()
);

/**
 * The action can fire when no requests are actually made (i.e., an empty
 * requestedExperimentIds).
 */
export const fetchRunsSucceeded = createAction(
  '[Runs] Fetch Runs Succeeded',
  props<{
    experimentIds: string[];
    runsForAllExperiments: Run[];
    newRunsAndMetadata: ExperimentIdToRunsAndMetadata;
  }>()
);

export const fetchRunsFailed = createAction(
  '[Runs] Fetch Runs Failed',
  props<{experimentIds: string[]; requestedExperimentIds: string[]}>()
);

export const runSelectionToggled = createAction(
  '[Runs] Run Selection Toggled',
  props<{runId: string}>()
);

export const runPageSelectionToggled = createAction(
  '[Runs] Run Page Selection Toggled',
  props<{runIds: string[]}>()
);

export const runSelectorPaginationOptionChanged = createAction(
  '[Runs] Run Selector Pagination Option Changed',
  props<{pageSize: number; pageIndex: number}>()
);

export const runSelectorSortChanged = createAction(
  '[Runs] Run Selector Sort Changed',
  props<{key: SortKey; direction: SortDirection}>()
);

export const runSelectorRegexFilterChanged = createAction(
  '[Runs] Run Selector Regex Filter Changed',
  props<{regexString: string}>()
);

export const runColorChanged = createAction(
  '[Runs] Run Color Changed',
  props<{runId: string; newColor: string}>()
);

export const runTableShown = createAction(
  '[Runs] Run Table Shown',
  props<{experimentIds: string[]}>()
);

export const runGroupByChanged = createAction(
  '[Runs] Run Group By Changed',
  props<{experimentIds: string[]; groupBy: GroupBy}>()
);
