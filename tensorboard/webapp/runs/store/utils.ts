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
import {GroupBy, GroupByKey, Run, RunGroup} from '../types';
import {ExperimentId, RunId} from './runs_types';

export function groupRuns(
  groupBy: GroupBy,
  runs: Run[],
  runIdToExpId: Readonly<Record<RunId, ExperimentId>>
): RunGroup {
  const matches: {[id: string]: Run[]} = {};
  const nonMatches: Run[] = [];
  const runGroup: RunGroup = {matches, nonMatches};

  switch (groupBy.key) {
    case GroupByKey.RUN:
      for (const run of runs) {
        matches[run.id] = [run];
      }
      break;
    case GroupByKey.EXPERIMENT:
      for (const run of runs) {
        const experimentId = runIdToExpId[run.id];
        const runs = matches[experimentId] || [];
        runs.push(run);
        matches[experimentId] = runs;
      }
      break;

    case GroupByKey.REGEX:
      if (!groupBy.regexString) {
        //TODO(japie1235813): propagate invalidity of regex string to user more gracefully
        break;
      }
      let regExp: RegExp;

      // TODO(japie1235813): add additonal `\` to convert string to regex, which
      // makes `new RegExp()` construct properly
      // For example, convert `foo\d+bar` to `foo\\d+bar`

      try {
        regExp = new RegExp(groupBy.regexString);
      } catch (e) {
        //TODO(japie1235813): propagate invalidity of regex string to user more gracefully
        break;
      }

      for (const run of runs) {
        const matchesList = run.name.match(regExp);
        if (matchesList) {
          const hasCapturingGroup = matchesList.length > 1;
          // In case regex string does not have a capturing group, we use pseudo group id of `pseudo_group`.
          const id = hasCapturingGroup
            ? JSON.stringify(matchesList.slice(1))
            : 'pseudo_group';
          const runs = matches[id] || [];
          runs.push(run);
          matches[id] = runs;
        } else {
          nonMatches.push(run);
        }
      }
      break;
    default:
  }
  return runGroup;
}

/**
 * Util function for composing `GroupBy` key and regex string.
 */
export function createGroupBy(
  groupByKey: GroupByKey,
  regexString?: string
): GroupBy {
  switch (groupByKey) {
    case GroupByKey.REGEX:
      return {key: groupByKey, regexString: regexString ?? ''};
    case GroupByKey.RUN:
    case GroupByKey.EXPERIMENT:
    default:
      return {key: groupByKey};
  }
}
