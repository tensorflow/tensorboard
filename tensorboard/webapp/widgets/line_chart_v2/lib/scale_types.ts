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

import {Formatter} from './formatter';

export enum ScaleType {
  LINEAR,
  LOG10,
  TIME,
}

/**
 * A `Scale` takes `domain` and sometimes `range` and provide coordinate system
 * transformation and convenience method around interval. Similar abstraction as d3.scale.
 *
 * Unlike d3.scale, it is pure and does not have performance impact.
 *
 * Important: both `domain` and `range` require to be finite numbers. The order of the
 * values do not matter (e.g., domain[1] < domain[0] is okay).
 */
export interface Scale {
  /**
   * Converts `x` in `domain` coordinates into `range` coordinates.
   */
  forward(domain: [number, number], range: [number, number], x: number): number;

  /**
   * Converts `x` in `range` coordinates into `domain` coordinates.
   */
  reverse(domain: [number, number], range: [number, number], x: number): number;

  /**
   * Attempts to transform domain into nice round numbers. Analogous to `d3.nice`.
   *
   * @param domain Two finite numbers to compuute round number from.
   */
  niceDomain(domain: [number, number]): [number, number];

  /**
   * Returns "human friendly" numbers between the `domain` that can be used for ticks and
   * grid.
   *
   * In case the spread of an interval is 0 or negligible, it can return an empty array
   * depending on an implementation.
   *
   * Examples:
   *   ticks([0, 10], 5) -> [0, 2, 4, 6, 8, 10]
   *   ticks([10, 0], 5) -> [10, 8, 6, 4, 2, 0]
   *   ticks([10, 10], 5) -> []
   *
   * @param domain Interval in which tick should be created.
   * @param sizeGuidance approximate number of the ticks. Depending on the domain, it
   *    may return less or more ticks.
   */
  ticks(domain: [number, number], sizeGuidance: number): number[];

  /**
   * Returns true when a value, x, is a value, can be safely transformed symmetrically*,
   * and is not an extremum.
   *
   * *: e.g., f(1) = 2 and f'(2) = 1 vs. f(1) = NaN and f'(NaN) = ?.
   */
  isSafeNumber(x: number): boolean;

  defaultFormatter: Formatter;
}
