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
import {Run, HparamValue} from './data_source/runs_data_source_types';

export {Run, DiscreteHparamValue} from './data_source/runs_data_source_types';

export type ExperimentIdToRuns = Record<
  string,
  {
    runs: Run[];
  }
>;

export interface RunGroup {
  matches: Record<string, Run[]>;
  nonMatches: Run[];
}

export enum GroupByKey {
  // Group runs by run names.
  RUN,
  // Group all runs under the same experimentId is grouped as a group.
  EXPERIMENT,
  // Group runs by regex that matches on the run name. The specification for
  // the grouping is to be defined.
  REGEX,
  // Group runs by regex that matches on the experiment name.
  REGEX_BY_EXP,
}

export interface BaseGroupBy {
  key: GroupByKey.EXPERIMENT | GroupByKey.RUN;
}

export interface RegexGroupBy {
  key: GroupByKey.REGEX | GroupByKey.REGEX_BY_EXP;
  regexString: string;
}

export type GroupBy = BaseGroupBy | RegexGroupBy;

/**
 * The runs-related state created by deserializing a URL.
 */
export interface URLDeserializedState {
  runs: {
    groupBy: GroupBy | null;
    regexFilter: string | null;
  };
}

export type HparamMap = Map<HparamValue['name'], HparamValue['value']>;

export type RunToHparamMap = Record<Run['id'], HparamMap>;
