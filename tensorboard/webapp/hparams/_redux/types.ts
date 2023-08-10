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
import {
  DiscreteFilter,
  HparamSpec,
  IntervalFilter,
  MetricSpec,
  HparamAndMetricSpec,
  SessionGroup,
} from '../_types';

export interface HparamsMetricsAndFilters {
  hparam: {
    specs: HparamSpec[];
    defaultFilters: Map<string, DiscreteFilter | IntervalFilter>;
  };
  metric: {
    specs: MetricSpec[];
    defaultFilters: Map<string, IntervalFilter>;
  };
}

export type ExperimentToHparams = Record<
  // experiemnt Id.
  string,
  HparamsMetricsAndFilters
>;

/**
 * Key used to namespace the hparams reducer.
 */
export const HPARAMS_FEATURE_KEY = 'hparams';

export interface HparamsState {
  specs: ExperimentToHparams;
  currentSpecs: HparamAndMetricSpec;
  sessionGroups: SessionGroup[];
  /**
   * RATIONALE: we do not use the NamespaceContextedState because of the following reasons.
   * - RunsTable which uses the state renders both on the dashboard view and the
   *     experiments list view.
   * - For the RunsTable on the list view, we have to key the state by an experimentId
   *    since we cannot have filter for multiple experiments in the view mutate the same
   *    object.
   * - For the dashboard view that supports comparison, we need to remember filter state
   *    when viewing multiple experiments separate from a single version one; while we can
   *    technically have a reasonable UX, it makes things more complex.
   * - We can use NamespaceContextedState to separate single experiment filter selection to be
   *    separate for the list and the dashboard views, but them shared is not too bad.
   */
  filters: {
    [id: string]: {
      hparams: Map<string, DiscreteFilter | IntervalFilter>;
      metrics: Map<string, IntervalFilter>;
    };
  };
}

export interface State {
  [HPARAMS_FEATURE_KEY]?: HparamsState;
}
