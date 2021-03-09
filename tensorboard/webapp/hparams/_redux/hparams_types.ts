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
 * @fileoverview Hparams types for usage in reducers and effects.
 */

import {DiscreteFilter, HparamSpec, IntervalFilter, MetricSpec} from '../types';

/**
 * Key used to namespace the hparams reducer.
 */
export const HPARAMS_FEATURE_KEY = 'hparams';

type ExperimentId = string;

export interface HparamsMetricsAndFilters {
  hparam: {
    specs: HparamSpec[];
    filters: Map<string, DiscreteFilter | IntervalFilter>;
    defaultFilters: Map<string, DiscreteFilter | IntervalFilter>;
  };
  metric: {
    specs: MetricSpec[];
    filters: Map<string, IntervalFilter>;
    defaultFilters: Map<string, IntervalFilter>;
  };
}

export type ExperimentToHparams = Record<
  ExperimentId,
  HparamsMetricsAndFilters
>;

export interface HparamsState {
  data: ExperimentToHparams;
}

export interface State {
  [HPARAMS_FEATURE_KEY]?: HparamsState;
}
