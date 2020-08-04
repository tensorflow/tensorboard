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
import {ValueListing, MetricListing} from '../store/npmi_types';

// HACK: Below import is for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

export const valuesRequested = createAction('[NPMI] nPMI Values Requested');

export const valuesLoaded = createAction(
  '[NPMI] nPMI Values Loaded',
  props<{values: ValueListing; metrics: MetricListing}>()
);

export const valuesRequestFailed = createAction(
  '[NPMI] nPMI Values Request Failed'
);
