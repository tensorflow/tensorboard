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
import {Action, createReducer} from '@ngrx/store';
import {TextState} from './text_types';

const DATA_A_B_RUN1 = [
  {
    originalShape: [3],
    step: 0,
    stringArray: [['foo', 'bar', 'baz']],
    wallTimeInMs: 1577865600000,
    truncated: false,
  },
  {
    originalShape: [3],
    step: 1,
    stringArray: [['foo', 'baz']],
    wallTimeInMs: 1577865601000,
    truncated: false,
  },
];

const DATA_A_C_RUN1 = [
  {
    originalShape: [3],
    step: 0,
    stringArray: [
      [
        'We conducted an experiment and found the following data:\n\nPounds of chocolate | Happiness\n---|---\n0 | 1\n1 | 4\n2 | 9\n3 | 16\n4 | 25\n5 | 36\n6 | 49\n7 | 64\n8 | 81\n9 | 100\n10 | 121',
      ],
    ],
    wallTimeInMs: 1577865600000,
    truncated: false,
  },
  {
    originalShape: [3],
    step: 1,
    stringArray: [
      ['\u00d7', '**0**', '**1**', '**2**', '**3**', '**4**', '**5**'],
      ['**0**', '0', '0', '0', '0', '0', '0'],
      ['**1**', '0', '1', '2', '3', '4', '5'],
      ['**2**', '0', '2', '4', '6', '8', '10'],
      ['**3**', '0', '3', '6', '9', '12', '15'],
      ['**4**', '0', '4', '8', '12', '16', '20'],
      ['**5**', '0', '5', '10', '15', '20', '25'],
    ],
    wallTimeInMs: 1577865601000,
    truncated: false,
  },
];

const initialState = {
  runToTags: new Map([
    ['run1', ['a/b', 'a/c']],
    ['run2', ['a/b', 'a/d']],
    ['run3', ['c', 'a/b']],
  ]),
  data: new Map([
    [
      'run1',
      new Map([
        ['a/b', DATA_A_B_RUN1],
        ['a/c', DATA_A_C_RUN1],
      ]),
    ],
  ]),
  visibleRunTags: new Map<string, Array<{run: string; tag: string}>>(),
};

const reducer = createReducer(initialState);

export function reducers(state: TextState | undefined, action: Action) {
  return reducer(state, action);
}
