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
 * String utilities for TensorWidget.
 */

export const TENSOR_NAME_LENGTH_CUTOFF = 20;
export const ELLIPSES = '...';

/**
 * Format the name of a tensor for display.
 *
 * If the name is longer than `TENSOR_NAME_LENGTH_CUTOFF`, the middle part
 * of it will be replaced with ellipses.
 *
 * @param tensorName
 * @returns Formated tensor name.
 */
export function formatTensorName(tensorName: string): string {
  if (tensorName.length <= TENSOR_NAME_LENGTH_CUTOFF) {
    return tensorName;
  } else {
    const leadLength = Math.floor(TENSOR_NAME_LENGTH_CUTOFF / 2);
    const tailLength = TENSOR_NAME_LENGTH_CUTOFF - ELLIPSES.length - leadLength;
    return (
      tensorName.slice(0, leadLength) +
      ELLIPSES +
      tensorName.slice(tensorName.length - tailLength, tensorName.length)
    );
  }
}

/**
 * Format a numeric value as a human-readable string.
 * @param num Numeric value to be formatted.
 * @param isInteger Whether the value is of an integer dtype.
 * @param decimalPoints How many decimal points to use.
 * @returns Formatted string representing the number.
 */
export function numericValueToString(
  num: number,
  isInteger: boolean,
  decimalPoints = 2,
  format?: 'fixed' | 'exponential'
): string {
  if (isNaN(num)) {
    return 'NaN';
  } else if (num === -Infinity) {
    return '-∞';
  } else if (num === Infinity) {
    return '+∞';
  } else {
    if (format == null) {
      const absValue = Math.abs(num);
      if ((absValue < 1e3 && absValue >= 1e-2) || absValue === 0) {
        format = 'fixed';
      } else {
        format = 'exponential';
      }
    }
    if (format == null || format === 'fixed') {
      if (isInteger) {
        return `${num}`;
      } else {
        return num.toFixed(decimalPoints);
      }
    } else {
      return num.toExponential(decimalPoints);
    }
  }
}

/**
 * Format a boolean value as a display-friendly string.
 * @param value
 * @param shortForm Returns full-length string (i.e., 'true' or 'false') if and
 *   only if this is `true`.
 * @returns Formatted string.
 */
export function booleanValueToDisplayString(
  value: boolean | number,
  shortForm = true
): string {
  // TODO(cais): Color coding display for boolean values (e.g., black/white).
  const trueStr = shortForm ? 'T' : 'True';
  const falseStr = shortForm ? 'F' : 'False';
  return value ? trueStr : falseStr;
}

/**
 * Format a string value as a display-friendly string.
 * @param value
 * @param lengthLimit If and only if not `null`, the length of the returned
 *   string will be limited to this value, with truncation and ellipses
 *   appended.
 * @return Formatted string.
 */
export function stringValueToDisplayString(
  value: string,
  lengthLimit: number | null = 4
) {
  if (lengthLimit === null || value.length <= lengthLimit) {
    return value;
  } else {
    return value.slice(0, lengthLimit - 1) + '…';
  }
}
