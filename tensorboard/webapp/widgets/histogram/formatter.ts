/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import * as d3 from '../../third_party/d3';

const LARGE_NUMBER = 10000;
const SMALL_NUMBER = 0.001;

const d3LargeFormatter = d3.format('.2~s');
const d3MiddleFormatter = d3.format('.4~r');
const d3SmallFormatter = d3.format('.2~e');

export function formatTickNumber(x: number | {valueOf(): number}): string {
  /**
   *  Formats very large nubmers using SI notation, very small numbers
   *  using exponential notation, and mid-sized numbers using their
   *  natural printout.
   */
  if (x === 0) {
    return '0';
  }
  const absNum = Math.abs(x as number);
  if (absNum >= LARGE_NUMBER) {
    return d3LargeFormatter(x);
  }
  if (absNum < SMALL_NUMBER) {
    return d3SmallFormatter(x);
  }
  return d3MiddleFormatter(x);
}
