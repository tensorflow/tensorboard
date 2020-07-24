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

export interface BenchmarkContext {
  container: HTMLElement;
  flushAsync: () => Promise<void>;
  [key: string]: any;
}

export interface Result {
  totalTimeInMs: number;
  timePerIterationInMs: number[];
  timeInGcInMs: number[] | null;
  numIterations: number;
  benchmark: Benchmark;
}

export interface Benchmark {
  name: string;

  // Pre-configure number of execution of the runs.
  size: Size;

  // Has the same semantic meaning as jasmine's `before`.
  before?: (context: BenchmarkContext) => void | Promise<void>;

  // The part that runs the test. May be executed more than once.
  run: (context: BenchmarkContext) => void | Promise<void>;

  // Has the same semantic meaning as jasmine's `after`.
  after?: (context: BenchmarkContext) => void | Promise<void>;

  // Has the same semantic meaning as jasmine's `afterEach`.
  afterEach?: (context: BenchmarkContext) => void | Promise<void>;
}

/**
 * Size of a test. Size determines the iteration of the test.
 */
export enum Size {
  SMALL,
  MEDIUM,
  LARGE,
}

export type Reporter = (results: Result[]) => void;
