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
import {
  HparamValue,
  MetricValue,
  DiscreteHparamValues,
  DomainType,
  HparamSpec,
  MetricSpec,
} from '../runs/data_source/runs_data_source_types';

export {
  DatasetType,
  DiscreteHparamValue,
  DiscreteHparamValues,
  DomainType,
  HparamSpec,
  HparamsValueType,
  MetricSpec,
  Domain,
  HparamValue,
  RunToHparamsAndMetrics,
} from '../runs/data_source/runs_data_source_types';

export {
  HparamSpec as BackendHparamSpec,
  DiscreteDomainHparamSpec,
  BackendHparamsExperimentResponse,
  BackendListSessionGroupResponse,
  BackendListSessionGroupRequest,
  BackendHparamsValueType,
  RunStatus,
  SessionGroup,
} from '../runs/data_source/runs_backend_types';

export interface HparamsAndMetricsValues {
  hparams: HparamValue[];
  metrics: MetricValue[];
}

export interface HparamsAndMetricsSpecs {
  hparams: HparamSpec[];
  metrics: MetricSpec[];
}

export type ExperimentToHparamsMetrics = Record<
  string,
  {
    specs: HparamsAndMetricsSpecs;
    values: HparamsAndMetricsValues;
  }
>;

export interface HparamAndMetricSpec {
  hparams: HparamSpec[];
  metrics: MetricSpec[];
}

export interface DiscreteFilter {
  type: DomainType.DISCRETE;
  includeUndefined: boolean;
  possibleValues: DiscreteHparamValues;
  // Subset of `possibleValues`
  filterValues: DiscreteHparamValues;
}

export interface IntervalFilter {
  type: DomainType.INTERVAL;
  includeUndefined: boolean;
  minValue: number;
  maxValue: number;
  // Filter values have to be in between min and max values (inclusive).
  filterLowerValue: number;
  filterUpperValue: number;
}
