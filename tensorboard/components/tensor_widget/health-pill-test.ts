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

import {formatBreakdownText, healthPillEntries} from './health-pill';
import { IntOrFloatTensorHealthPill } from './health-pill-types';

describe('healthPillEntries', () => {
  it('Correct entries', () => {
    const labels = healthPillEntries.map(entry => entry.label);
    expect(labels.indexOf('NaN')).not.toEqual(-1);
    expect(labels.indexOf('-∞')).not.toEqual(-1);
    expect(labels.indexOf('+∞')).not.toEqual(-1);
    expect(labels.indexOf('-')).not.toEqual(-1);
    expect(labels.indexOf('0')).not.toEqual(-1);
    expect(labels.indexOf('+')).not.toEqual(-1);
  });
});

describe('formatBreakdownText', () => {
  it('Only zeros', () => {
    const pillData: IntOrFloatTensorHealthPill = {
      elementCount: 10,
      zeroCount: 10,
      negativeCount: 0,
      positiveCount: 0,
      negativeInfinityCount: 0,
      positiveInfinityCount: 0,
      nanCount: 0,
      mean: 0,
      stdDev: 1,
      minimum: -2,
      maximum: 2,
    };

    const text = formatBreakdownText(pillData).split('\n');
    expect(text.length).toEqual(4);
    expect(text[1]).toEqual('#(zero): 10');
    expect(text[3]).toEqual('#(total): 10');
  });

  it('NaNs and Infinities', () => {
    const pillData: IntOrFloatTensorHealthPill = {
      elementCount: 9,
      zeroCount: 0,
      negativeCount: 0,
      positiveCount: 0,
      negativeInfinityCount: 2,
      positiveInfinityCount: 3,
      nanCount: 4,
      mean: null,
      stdDev: null,
      minimum: null,
      maximum: null,
    };

    const text = formatBreakdownText(pillData).split('\n');
    expect(text.length).toEqual(6);
    expect(text[1]).toEqual('#(-∞): 2');
    expect(text[2]).toEqual('#(+∞): 3');
    expect(text[3]).toEqual('#(NaN): 4');
    expect(text[5]).toEqual('#(total): 9');
  });
});
