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

import {createAction, props} from '@ngrx/store';
import {StepDatum} from '../data_source';
import {TagGroup} from '../types';

export const textPluginLoaded = createAction('[Text] Text Plugin Loaded');

export const textRunToTagsLoaded = createAction(
  '[Text] Runs To Tag Loaded',
  props<{runToTags: Map<string, string[]>}>()
);

export const textTagGroupVisibilityChanged = createAction(
  '[Text] Tag Group Visibility Changed',
  props<{
    tagGroup: TagGroup;
    visibleTextCards: Array<{
      run: string;
      tag: string;
    }>;
  }>()
);

export const textDataLoaded = createAction(
  '[Text] Text Data Loaded Loaded',
  props<{
    run: string;
    tag: string;
    stepData: StepDatum[];
  }>()
);
