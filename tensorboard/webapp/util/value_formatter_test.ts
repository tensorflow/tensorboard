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
import {formatNumber, formatRelativeTimeInMs} from './value_formatter';

describe('value formatter test', () => {
  it('formatHoursRelative properly formats', () => {
    const oneHourInMs = 1000 * 60 * 60;
    expect(formatRelativeTimeInMs(oneHourInMs * 10.555)).toBe('10h 33m 17s');
    expect(formatRelativeTimeInMs(oneHourInMs * NaN)).toBe('NaNs');
    expect(formatRelativeTimeInMs(oneHourInMs * 10)).toBe('10h 0m 0s');
    expect(formatRelativeTimeInMs(oneHourInMs * 0.5)).toBe('30m 0s');
    expect(formatRelativeTimeInMs(oneHourInMs * 0.01)).toBe('36s');
    expect(formatRelativeTimeInMs(oneHourInMs * 0.0001)).toBe('0s');
  });

  it('formatNumber properly formats', () => {
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(10.55)).toBe('10.55');
    expect(formatNumber(-10.55)).toBe('-10.55');
    expect(formatNumber(-10.555555)).toBe('-10.56');
    expect(formatNumber(10.555555)).toBe('10.56');
    expect(formatNumber(0.000001234567)).toBe('0.000001235');
    expect(formatNumber(0.0000001234567)).toBe('1.235e-7');
    expect(formatNumber(100000.123456789)).toBe('1.000e+5');
    expect(formatNumber(NaN)).toBe('NaN');
    expect(formatNumber(2e23)).toBe('2.000e+23');
    expect(formatNumber(-2e-23)).toBe('-2.000e-23');
  });
});
