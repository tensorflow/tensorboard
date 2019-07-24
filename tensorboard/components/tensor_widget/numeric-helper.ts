/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
 * Format a numeric value as a human-readable string.
 * @param num Numeric value t be formatted.
 * @param decimalPoints How many decimal points to use.
 */
export function numericValueToString(
    num: number, decimalPoints = 2, format?: 'fixed' | 'exponential'): string {
  if (Number.isNaN(num)) {
    return 'NaN';
  } else if (num === -Infinity) {
    return '-∞';
  } else if (num === Infinity) {
    return '+∞';
  } else {
    if (format == null) {
      const absValue = Math.abs(num);
      if (absValue < 1e3 && absValue >= 1e-2 || absValue === 0) {
        format = 'fixed';
      } else {
        format = 'exponential';
      }
    }
    if (format == null || format === 'fixed') {
      return num.toFixed(decimalPoints);
    } else {
      return num.toExponential(decimalPoints);
    }
  }
}
