/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {memoize} from './memoize';

describe('memoize', () => {
  let add: (a: number, b: number, c: number) => number;
  let sum: (numbers: number[]) => number;
  let createNumArray: (
    a: number,
    b: number,
    c: number
  ) => [number, number, number];

  beforeEach(() => {
    add = memoize((a: number, b: number, c: number) => a + b + c);
    sum = memoize((numbers: number[]) =>
      numbers.reduce((sum, num) => sum + num, 0)
    );
    createNumArray = memoize((a: number, b: number, c: number) => [a, b, c]);
  });

  it('generates a new result when arguments change', () => {
    expect(add(1, 2, 3)).toEqual(6);
    expect(add(4, 5, 6)).toEqual(15);

    expect(sum([1, 2, 3])).toEqual(6);
    expect(sum([4, 5, 6])).toEqual(15);

    expect(createNumArray(1, 2, 3)).not.toBe(createNumArray(3, 2, 1));
  });

  it('reuses existing result when arguments are the same', () => {
    expect(createNumArray(1, 2, 3)).toBe(createNumArray(1, 2, 3));
  });
});
