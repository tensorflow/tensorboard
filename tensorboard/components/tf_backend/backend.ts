/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_backend {

export type RunToTag = {
  [run: string]: string[];
};

export interface Datum {
  wall_time: Date;
  step: number;
}

// An object that encapsulates an alert issued by the debugger. This alert is
// sent by debugging libraries after bad values (NaN, +/- Inf) are encountered.
export interface DebuggerNumericsAlertReport {
  device_name: string;
  tensor_name: string;
  first_timestamp: number;
  nan_event_count: number;
  neg_inf_event_count: number;
  pos_inf_event_count: number;
}
// A DebuggerNumericsAlertReportResponse contains alerts issued by the debugger
// in ascending order of timestamp. This helps the user identify for instance
// when bad values first appeared in the model.
export type DebuggerNumericsAlertReportResponse = DebuggerNumericsAlertReport[];

export const TYPES = [];

/** Given a RunToTag, return sorted array of all runs */
export function getRunsNamed(r: RunToTag): string[] {
  return _.keys(r).sort(vz_sorting.compareTagNames);
}

/** Given a RunToTag, return array of all tags (sorted + dedup'd) */
export function getTags(r: RunToTag): string[] {
  return _.union.apply(null, _.values(r)).sort(vz_sorting.compareTagNames);
}

/**
 * Given a RunToTag and an array of runs, return every tag that appears for
 * at least one run.
 * Sorted, deduplicated.
 */
export function filterTags(r: RunToTag, runs: string[]): string[] {
  let result = [];
  runs.forEach((x) => result = result.concat(r[x]));
  return _.uniq(result).sort(vz_sorting.compareTagNames);
}

function timeToDate(x: number): Date {
  return new Date(x * 1000);
};

/**  Just a curryable map to make things cute and tidy. */
function map<T, U>(f: (x: T) => U): (arr: T[]) => U[] {
  return function(arr: T[]): U[] {
    return arr.map(f);
  };
};

/**
 * This is a higher order function that takes a function that transforms a
 * T into a G, and returns a function that takes TupleData<T>s and converts
 * them into the intersection of a G and a Datum.
 */
function detupler<T, G>(xform: (x: T) => G): (t: TupleData<T>) => Datum & G {
  return function(x: TupleData<T>): Datum & G {
    // Create a G, assert it has type <G & Datum>
    let obj = <G&Datum>xform(x[2]);
    // ... patch in the properties of datum
    obj.wall_time = timeToDate(x[0]);
    obj.step = x[1];
    return obj;
  };
};

/**
 * The following interface (TupleData) describes how the data is sent
 * over from the backend.
 */
type TupleData<T> = [number, number, T];  // wall_time, step

}  // namespace tf_backend
