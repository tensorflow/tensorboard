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
/**
 * @fileoverview Helps matching runs.
 */
import {ExperimentAlias} from '../experiments/types';

export interface RunMatchable {
  runName: string;
  experimentAlias: ExperimentAlias;
}

/**
 * Matches an entry based on regex and business logic.
 *
 * - Regex matches name of a run.
 * - When `shouldMatchExperiment` is specified, it matches regex against one of
 *   experiment alias, and legacy run name which is generated
 *   with "<exp alias>/<run name>".
 * - An empty regex string always returns true.
 * - Invalid regex always return false.
 * - Regex matches are case insensitive.
 * - Regex matches are not anchored.
 */
export function matchRunToRegex(
  runMatchable: RunMatchable,
  regexString: string,
  shouldMatchExperiment: boolean
): boolean {
  if (!regexString) return true;

  let regex: RegExp;
  try {
    regex = new RegExp(regexString, 'i');
  } catch {
    return false;
  }

  const matchables = [runMatchable.runName];
  if (shouldMatchExperiment) {
    matchables.push(
      runMatchable.experimentAlias.aliasText,
      `${runMatchable.experimentAlias.aliasText}/${runMatchable.runName}`
    );
  }
  return matchables.some((matchable) => regex!.test(matchable));
}
