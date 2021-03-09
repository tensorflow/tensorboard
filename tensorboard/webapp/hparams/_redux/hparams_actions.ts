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
 * @fileoverview Hparams Ngrx actions.
 */

import {createAction, props} from '@ngrx/store';

import {DiscreteHparamValues} from '../types';

/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

export const hparamsDiscreteHparamFilterChanged = createAction(
  '[Hparams] Hparams Discrete Hparam Filter Changed',
  props<{
    experimentId: string;
    hparamName: string;
    filterValues: DiscreteHparamValues;
    includeUndefined: boolean;
  }>()
);

export const hparamsIntervalHparamFilterChanged = createAction(
  '[Hparams] Hparams Interval Hparam Filter Changed',
  props<{
    experimentId: string;
    hparamName: string;
    filterLowerValue: number;
    filterUpperValue: number;
    includeUndefined: boolean;
  }>()
);

export const hparamsMetricFilterChanged = createAction(
  '[Hparams] Hparams Metric Filter Changed',
  props<{
    experimentId: string;
    metricTag: string;
    filterLowerValue: number;
    filterUpperValue: number;
    includeUndefined: boolean;
  }>()
);
