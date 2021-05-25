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
  let runGroups: {[groupId: string]: Run[]} = {};
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
      if (!groupBy.regexString) {
        //TODO(japie1235813): props users when the input is invalid
        throw new Error('Invalid regex');
      }

      // TODO(japie1235813): add additonal `\` to convert string to regex, which
      // makes `new RegExp()` construct properly
      // For example, convert `foo\d+bar` to `foo\\d+bar`

      try {
        new RegExp(groupBy.regexString);
      } catch(e) {
        //TODO(japie1235813): props users when the input is invalid
        throw new Error('Invalid regex');
      }

      const regExp = new RegExp(groupBy.regexString);
      // Checks if there is capture group in regex.
      let isCaptureGroup = false;

      for (const run of runs) {
        let matches = (run.name).match(regExp)
          if (matches) {
          if(matches.length > 1) {
            matches = matches.slice(1)
            isCaptureGroup = true;
          }
          const id = matches.length === 1 ? matches[0] : matches.join('_');
          const runs = runGroups[id] || [];
          runs.push(run);
          runGroups[id] = runs;
        } else {
          runGroups[run.id] = [run];
        }
      }

      if (!isCaptureGroup) {
        // No capture group in regex string. Groups all the matched runs together.
        const matchedRuns = [];
        runGroups = {};
        for (const run of runs) {
          let matches = (run.name).match(regExp)
          if (matches) {
            matchedRuns.push(run);
            delete runGroups[run.id];
          } else {
            runGroups[run.id] = [run];
          }
        }
        runGroups['matches'] = matchedRuns;
      }
      break;
    default:
  }
  return runGroups;
}
