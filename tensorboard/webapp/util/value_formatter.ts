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
/**
 * @fileoverview Utilities related to formatting values.
 */

/**
 * Formats a time, given as number of hours. e.g.
 * > formatRelativeTimeInMs(10555 * 60 * 60)
 * "10h 33m 17s"
 */
export function formatRelativeTimeInMs(timeInMs: number): string {
  // We will always show 2 units of precision, e.g days and hours, or
  // minutes and seconds, but not hours and minutes and seconds.
  const result: string[] = [];
  const timeInHours = timeInMs / (1000 * 60 * 60);
  const days = Math.floor(timeInHours / 24);
  if (days) {
    result.push(days.toString() + 'd');
  }

  const remainingHours = timeInHours - days * 24;
  const hours = Math.floor(remainingHours);
  if (hours || days) {
    result.push(hours.toString() + 'h');
  }

  const remainingMinutes = (remainingHours - hours) * 60;
  const minutes = Math.floor(remainingMinutes);
  if (minutes || hours || days) {
    result.push(minutes.toString() + 'm');
  }

  const remainingSeconds = (remainingMinutes - minutes) * 60;
  const seconds = Math.floor(remainingSeconds);
  result.push(seconds.toString() + 's');

  return result.join(' ');
}

/**
 * Integers less than this number can be safely formatted as-is.
 */
const MAX_SMALL_INTEGER = Math.pow(10, 4);

/**
 * This numeric formatter currently covers common cases only.
 *
 * The Polymer version relies on D3, which gives more features for free:
 * selecting decimal vs exponent notation, rounding to significant digits, and
 * removing insignificant trailing zeros.
 */
export function formatNumber(value: number): string {
  if (isNaN(value) || !Number.isFinite(value)) {
    return value.toString();
  }
  if (Number.isInteger(value) && Math.abs(value) < MAX_SMALL_INTEGER) {
    return value.toString();
  }
  return value.toPrecision(4);
}
