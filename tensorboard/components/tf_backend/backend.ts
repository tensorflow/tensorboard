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

import {compareTagNames} from '../vz-sorting/sorting.js';
import {RequestManager} from './requestManager.js';
import {getRouter} from './router.js';
import {demoify, queryEncoder} from './urlPathHelpers.js';

export interface RunEnumeration {
  images: string[];
}

export interface LogdirResponse { logdir: string; }

export interface RunsResponse { [runName: string]: RunEnumeration; }

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
/**
 * The Backend class provides a convenient and typed interface to the backend.
 *
 * It provides methods corresponding to the different data sources on the
 * TensorBoard backend. These methods return a promise containing the data
 * from the backend. This class does some post-processing on the data; for
 * example, converting data elements tuples into js objects so that they can
 * be accessed in a more convenient and clearly-documented fashion.
 */
export class Backend {
  public requestManager: RequestManager;

  /**
   * Construct a Backend instance.
   * @param requestManager The RequestManager, overwritable so you may
   * manually clear request queue, etc. Defaults to a new RequestManager.
   */
  constructor(requestManager?: RequestManager) {
    this.requestManager = requestManager || new RequestManager();
  }

  /**
   * Returns a promise for requesting the logdir string.
   */
  public logdir(): Promise<LogdirResponse> {
    return this.requestManager.request(getRouter().logdir());
  }

  /**
   * Returns a listing of all the available data in the TensorBoard backend.
   */
  public runs(): Promise<RunsResponse> {
    return this.requestManager.request(getRouter().runs());
  }
}

/** Given a RunToTag, return sorted array of all runs */
export function getRuns(r: RunToTag): string[] {
  return _.keys(r).sort(compareTagNames);
}

/** Given a RunToTag, return array of all tags (sorted + dedup'd) */
export function getTags(r: RunToTag): string[] {
  return _.union.apply(null, _.values(r)).sort(compareTagNames);
}

/**
 * Given a RunToTag and an array of runs, return every tag that appears for
 * at least one run.
 * Sorted, deduplicated.
 */
export function filterTags(r: RunToTag, runs: string[]): string[] {
  let result = [];
  runs.forEach((x) => result = result.concat(r[x]));
  return _.uniq(result).sort(compareTagNames);
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
