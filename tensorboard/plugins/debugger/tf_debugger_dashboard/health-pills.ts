/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
/* TypeScript module for predicates on health pills. */

namespace tf_debugger_dashboard {

function checkRefValue(refValue: number, condition: string) {
  if (refValue == null) {
    throw new Error(`Missing refValue for condition (${condition}).`);
  }
}

/**
 * Check if a health pill meets the given condition.
 *
 * Any condition value that involves numerical comparison require a value
 *   in the `refValue` argument (see below).
 * @param healthPill The health pill.
 * @param refValue Threshold required by some of the condition values. If not
 *   provided for such conditions, an Error will be thrown.
 * @return Whether the condition is met.
 * @throws Error on in valid condition values or missing refValue for conditions
 *   that requires it.
 */
export type TensorConditionPredicate =
    (healthPill: number[], refValue?: number) => boolean;


export interface TensorCondition {
  description: string;
  predicate: TensorConditionPredicate;
}

function isHealthPillUninitializedOrUnsupported(healthPill: number[]): boolean {
  return healthPill == null || healthPill.length == 0 || healthPill[0] !== 1;
}

/**
 * A collection of tensor value conditions.
 *
 * With the human-readable description and the predicate function for each
 *   condition.
 */
const tensorConditions: {[key: string]: TensorCondition} = {
  INF_OR_NAN: {
    description: 'Contains +/-∞ or NaN',
    predicate: (healthPill: number[], refValue?: number) => {
      return healthPill[2] > 0 || healthPill[3] > 0 || healthPill[7] > 0;
    },
  },
  INF: {
    description: 'Contains +/-∞',
    predicate: (healthPill: number[], refValue?: number) => {
      return healthPill[3] > 0 || healthPill[7] > 0;
    },
  },
  NAN: {
    description: 'Contains NaN',
    predicate: (healthPill: number[], refValue?: number) => {
      return healthPill[2] > 0;
    },
  },
  MAX_GT: {
    description: 'Max >',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'MAX_GT');
      return healthPill[9] > refValue;
    },
  },
  MAX_LT: {
    description: 'Max <',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'MAX_LT');
      return healthPill[9] < refValue;
    },
  },
  MIN_GT: {
    description: 'Min >',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'MIN_GT');
      return healthPill[8] > refValue;
    },
  },
  MIN_LT: {
    description: 'Min <',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'MIN_LT');
      return healthPill[8] < refValue;
    },
  },
  MEAN_GT: {
    description: 'Mean >',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'MEAN_GT');
      return healthPill[10] > refValue;
    },
  },
  MEAN_LT: {
    description: 'Mean <',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'MEAN_LT');
      return healthPill[10] < refValue;
    },
  },
  RANGE_GT: {
    description: 'Max - Min >',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'RANGE_GT');
      return healthPill[9] - healthPill[8] > refValue;
    },
  },
  RANGE_LT: {
    description: 'Max - Min <',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'RANGE_LT');
      return healthPill[9] - healthPill[8] < refValue;
    },
  },
  STDDEV_GT: {
    description: 'Standard deviation >',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'STDDEV_GT');
      return Math.sqrt(healthPill[11]) > refValue;
    },
  },
  STDDEV_LT: {
    description: 'Standard deviation <',
    predicate: (healthPill: number[], refValue?: number) => {
      checkRefValue(refValue, 'STDDEV_LT');
      return Math.sqrt(healthPill[11]) < refValue;
    },
  },
};

/**
 * Convert human-readable description of a tensor-value condition to its key.
 * @param description Human-readable description.
 * @returns The key, if exists. Else, `null`.
 */
export function tensorConditionDescription2Key(description: string): string {
  for (const key in tensorConditions) {
    if (!tensorConditions.hasOwnProperty(key)) {
      continue;
    }
    if (tensorConditions[key].description === description) {
      return key;
    }
  }
  return null;
}


/**
 * Test a health pill against a tensor-value condition.
 * @param key Key for the tensor-value condition, see `tensorConditions` for
 *   details.
 * @param healthPill The health pill.
 * @param refValue The reference value required by some of the tensor-value
 *   conditions, e.g., `MEAN_LT`.
 * @returns Whether the tensor condition specified by `key` (and potentially
 *   also `revValue` for some `key` values) is satisfied by `healthPill`.
 */
export function checkHealthPillAgainstTensorConditionKey(
    key: string, healthPill: number[], refValue?: number): boolean {
  if (isHealthPillUninitializedOrUnsupported(healthPill)) {
    return false;
  }
  const predicate = tensorConditions[key].predicate;
  return predicate(healthPill, refValue);
}

}
