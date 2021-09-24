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

import {Run} from '../runs/types';

export interface RunWithExperimentName extends Run {
  experimentName: string;
  experimentAlias: string;
}

export function matchRunToRegex(
  runWithName: RunWithExperimentName,
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

  const matchables = [runWithName.name];
  if (shouldMatchExperiment) {
    matchables.push(
      runWithName.experimentName,
      runWithName.experimentAlias,
      `${runWithName.experimentAlias}/${runWithName.name}`
    );
  }
  return matchables.some((matchable) => regex!.test(matchable));
}
