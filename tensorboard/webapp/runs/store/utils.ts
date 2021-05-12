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
import {GroupBy, GroupByKey, Run} from '../types';
import {ExperimentId, RunId} from './runs_types';

export function serializeExperimentIds(experimentIds: string[]): string {
  return JSON.stringify(experimentIds.slice().sort());
}

export function groupRuns(
  groupBy: GroupBy,
  runs: Run[],
  runIdToExpId: Readonly<Record<RunId, ExperimentId>>
): {[groupId: string]: Run[]} {
  const runGroups: {[groupId: string]: Run[]} = {};
  switch (groupBy.key) {
    case GroupByKey.RUN:
      for (const run of runs) {
        runGroups[run.id] = [run];
      }
      break;
    case GroupByKey.EXPERIMENT:
      for (const run of runs) {
        const experimentId = runIdToExpId[run.id];
        const runs = runGroups[experimentId] || [];
        runs.push(run);
        runGroups[experimentId] = runs;
      }
      break;

    case GroupByKey.REGEX:
      throw new Error('Not implemented');
    default:
  }
  return runGroups;
}
