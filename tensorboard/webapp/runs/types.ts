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
  DiscreteHparamValues,
  DomainType,
  HparamsAndMetadata,
  Run,
} from './data_source/runs_data_source_types';

export {
  DiscreteHparamValue,
  DiscreteHparamValues,
  DomainType,
  Run,
} from './data_source/runs_data_source_types';

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

export type ExperimentIdToRunsAndMetadata = Record<
  string,
  {
    runs: Run[];
    metadata: HparamsAndMetadata;
  }
>;

export enum SortType {
  EXPERIMENT_NAME,
  HPARAM,
  METRIC,
  RUN_NAME,
}

export interface HparamsSortKey {
  type: SortType.HPARAM;
  name: string;
}

export interface MetricsSortKey {
  type: SortType.METRIC;
  tag: string;
}

export type SortKey =
  | HparamsSortKey
  | MetricsSortKey
  | {type: SortType.RUN_NAME | SortType.EXPERIMENT_NAME};
