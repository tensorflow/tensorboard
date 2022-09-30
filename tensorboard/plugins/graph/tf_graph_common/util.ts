/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
/**
 * @fileoverview Utility functions for the tensorflow graph visualizer.
 */
import * as _ from 'lodash';
import {notifyActionEventFromPolymer} from '../../../components/tb_debug';
import {
  GraphDebugActionEventId,
  GraphDebugTimingEventId,
  GRAPH_DEBUG_ACTION_EVENT_CATEGORY,
  GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
} from '../../../components/tb_debug/types';
import {NodeStats, ProgressTracker} from './common';

const ASYNC_TASK_DELAY = 20;

interface DebugTimingEvent {
  timingId: GraphDebugTimingEventId;
  // An associated duration in milliseconds for a timing event.
  eventValue: number;
}

interface DebugActionEvent {
  actionId: GraphDebugActionEventId;
  eventLabel?: string;
}

export type DebugEvent = DebugTimingEvent | DebugActionEvent;

function isDebugTimingEvent(
  debugEvent: DebugEvent
): debugEvent is DebugTimingEvent {
  return debugEvent.hasOwnProperty('timingId');
}

export function notifyDebugEvent(debugEvent: DebugEvent) {
  if (isDebugTimingEvent(debugEvent)) {
    notifyActionEventFromPolymer({
      eventCategory: GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
      eventAction: debugEvent.timingId,
      eventValue: debugEvent.eventValue,
    });
  } else {
    notifyActionEventFromPolymer({
      eventCategory: GRAPH_DEBUG_ACTION_EVENT_CATEGORY,
      eventAction: debugEvent.actionId,
      eventLabel: debugEvent.eventLabel,
    });
  }
}

/**
 * Measure and log a synchronous task.
 */
export function time<T>(
  msg: string,
  task: () => T,
  debugEventId?: GraphDebugTimingEventId
) {
  let start = Date.now();
  let result = task();
  const durationInMs = Date.now() - start;
  /* tslint:disable */
  console.log(msg, ':', durationInMs, 'ms');
  /* tslint:enable */
  if (debugEventId) {
    notifyDebugEvent({timingId: debugEventId, eventValue: durationInMs});
  }
  return result;
}
/**
 * Creates a tracker that sets the progress property of the
 * provided polymer component. The provided component must have
 * a property called 'progress' that is not read-only. The progress
 * property is an object with a numerical 'value' property and a
 * string 'msg' property.
 */
export function getTracker(polymerComponent: any): ProgressTracker {
  return {
    setMessage: function (msg) {
      polymerComponent.set('progress', {
        value: polymerComponent.progress.value,
        msg: msg,
      });
    },
    updateProgress: function (value) {
      polymerComponent.set('progress', {
        value: polymerComponent.progress.value + value,
        msg: polymerComponent.progress.msg,
      });
    },
    reportError: function (msg: string, err) {
      // Log the stack trace in the console.
      console.error(err.stack);
      // And send a user-friendly message to the UI.
      polymerComponent.set('progress', {
        value: polymerComponent.progress.value,
        msg: msg,
        error: true,
      });
    },
  };
}
/**
 * Creates a tracker for a subtask given the parent tracker, the total
 * progress
 * of the subtask and the subtask message. The parent task should pass a
 * subtracker to its subtasks. The subtask reports its own progress which
 * becomes relative to the main task.
 */
export function getSubtaskTracker(
  parentTracker: ProgressTracker,
  impactOnTotalProgress: number,
  subtaskMsg: string
): ProgressTracker {
  return {
    setMessage: function (progressMsg) {
      // The parent should show a concatenation of its message along with
      // its subtask tracker message.
      parentTracker.setMessage(subtaskMsg + ': ' + progressMsg);
    },
    updateProgress: function (incrementValue) {
      // Update the parent progress relative to the child progress.
      // For example, if the sub-task progresses by 30%, and the impact on the
      // total progress is 50%, then the task progresses by 30% * 50% = 15%.
      parentTracker.updateProgress(
        (incrementValue * impactOnTotalProgress) / 100
      );
    },
    reportError: function (msg: string, err: Error) {
      // The parent should show a concatenation of its message along with
      // its subtask error message.
      parentTracker.reportError(subtaskMsg + ': ' + msg, err);
    },
  };
}
/**
 * Runs a synchronous expensive task and return the result.
 * Please use runAsyncPromiseTask in case a task returns a Promise.
 */
export function runTask<T>(
  msg: string,
  incProgressValue: number,
  task: () => T,
  tracker: ProgressTracker,
  debugEventId?: GraphDebugTimingEventId
): T {
  // Update the progress message to say the current running task.
  tracker.setMessage(msg);
  // Run the expensive task with a delay that gives enough time for the
  // UI to update.
  try {
    let result = time(msg, task, debugEventId);
    // Update the progress value.
    tracker.updateProgress(incProgressValue);
    // Return the result to be used by other tasks.
    return result;
  } catch (e: any) {
    // Errors that happen inside asynchronous tasks are
    // reported to the tracker using a user-friendly message.
    tracker.reportError('Failed ' + msg, e);
    return null!;
  }
}
/**
 * Runs an expensive task asynchronously and returns a promise of the result.
 */
export function runAsyncTask<T>(
  msg: string,
  incProgressValue: number,
  task: () => T,
  tracker: ProgressTracker,
  debugEventId?: GraphDebugTimingEventId
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Update the progress message to say the current running task.
    tracker.setMessage(msg);
    // Run the expensive task with a delay that gives enough time for the
    // UI to update.
    setTimeout(function () {
      try {
        let result = time(msg, task, debugEventId);
        // Update the progress value.
        tracker.updateProgress(incProgressValue);
        // Return the result to be used by other tasks.
        resolve(result);
      } catch (e: any) {
        // Errors that happen inside asynchronous tasks are
        // reported to the tracker using a user-friendly message.
        tracker.reportError('Failed ' + msg, e);
      }
    }, ASYNC_TASK_DELAY);
  });
}
/**
 * Asynchronously runs an expensive task that returns a promise. Updates the
 * tracker's progress after the promise resolves. Returns a new promise that
 * resolves after the progress is updated.
 */
export function runAsyncPromiseTask<T>(
  msg: string,
  incProgressValue: number,
  task: () => Promise<T>,
  tracker: ProgressTracker,
  debugEventId?: GraphDebugTimingEventId
): Promise<T> {
  return new Promise((resolve, reject) => {
    let handleError = function (e) {
      // Errors that happen inside asynchronous tasks are
      // reported to the tracker using a user-friendly message.
      tracker.reportError('Failed ' + msg, e);
      reject(e);
    };
    // Update the progress message to say the current running task.
    tracker.setMessage(msg);
    // Run the expensive task with a delay that gives enough time for the
    // UI to update.
    setTimeout(function () {
      try {
        let start = Date.now();
        task()
          .then(function (value) {
            const durationInMs = Date.now() - start;
            /* tslint:disable */
            console.log(msg, ':', durationInMs, 'ms');
            // Update the progress value.
            tracker.updateProgress(incProgressValue);
            notifyDebugEvent({
              timingId: debugEventId!,
              eventValue: durationInMs,
            });
            // Return the result to be used by other tasks.
            resolve(value);
          })
          .catch(handleError);
      } catch (e) {
        handleError(e);
      }
    }, ASYNC_TASK_DELAY);
  });
}
/**
 * Returns a query selector with escaped special characters that are not
 * allowed in a query selector.
 */
export function escapeQuerySelector(querySelector: string): string {
  return querySelector.replace(/([:.\[\],/\\\(\)])/g, '\\$1');
}
interface Unit {
  symbol: string;
  numUnits?: number;
}
type Units = ReadonlyArray<Unit>;
// For unit conversion.
export const MEMORY_UNITS: Units = [
  // Atomic unit.
  {symbol: 'B'},
  // numUnits specifies how many previous units this unit contains.
  {symbol: 'KB', numUnits: 1024},
  {symbol: 'MB', numUnits: 1024},
  {symbol: 'GB', numUnits: 1024},
  {symbol: 'TB', numUnits: 1024},
  {symbol: 'PB', numUnits: 1024},
];
export const TIME_UNITS: Units = [
  // Atomic unit. Finest granularity in TensorFlow stat collection.
  {symbol: 'µs'},
  // numUnits specifies how many previous units this unit contains.
  {symbol: 'ms', numUnits: 1000},
  {symbol: 's', numUnits: 1000},
  {symbol: 'min', numUnits: 60},
  {symbol: 'hr', numUnits: 60},
  {symbol: 'days', numUnits: 24},
];
/**
 * Returns the human readable version of the unit.
 * (e.g. 1.35 GB, 23 MB, 34 ms, 6.53 min etc).
 */
export function convertUnitsToHumanReadable(
  value: number,
  units: Units,
  unitIndex: number = 0
) {
  if (unitIndex + 1 < units.length && value >= units[unitIndex + 1].numUnits!) {
    return convertUnitsToHumanReadable(
      value / units[unitIndex + 1].numUnits!,
      units,
      unitIndex + 1
    );
  }
  // toPrecision() has the tendency to return a number in scientific
  // notation and casting back to a number brings it back to normal notation.
  // e.g.,
  //   > value = 213; value.toPrecision(1)
  //   < "2e+2"
  //   > Number(value.toPrecision(1))
  //   < 200
  return Number(value.toPrecision(3)) + ' ' + units[unitIndex].symbol;
}
export function hasDisplayableNodeStats(stats: NodeStats) {
  if (
    stats &&
    (stats.totalBytes > 0 || stats.getTotalMicros() > 0 || stats.outputSize)
  ) {
    return true;
  }
  return false;
}
/**
 * Given a list of strings, it returns a new list of strings with the longest
 * common prefix removed. If the common prefix is one of the strings in the
 * list, it returns the original strings.
 */
export function removeCommonPrefix(strings: string[]) {
  if (strings.length < 2) {
    return strings;
  }
  let index = 0;
  let largestIndex = 0;
  // Find the shortest name across all strings.
  let minLength = _.min(_.map(strings, (str) => str.length))!;
  while (true) {
    index++;
    let prefixes = _.map(strings, (str) => str.substring(0, index));
    let allTheSame = prefixes.every((prefix, i) => {
      return i === 0 ? true : prefix === prefixes[i - 1];
    });
    if (allTheSame) {
      if (index >= minLength) {
        // There is a string whose whole name is a prefix to other string.
        // In this case, we return the original list of string.
        return strings;
      }
      largestIndex = index;
    } else {
      break;
    }
  }
  return _.map(strings, (str) => str.substring(largestIndex));
}
/**
 * Given a timestamp in microseconds, return a human-friendly string denoting
 * how long ago the timestamp was.
 */
export function computeHumanFriendlyTime(timeInMicroseconds: number) {
  var timeDifferenceInMs = +new Date() - +new Date(timeInMicroseconds / 1000);
  if (timeDifferenceInMs < 30000) {
    return 'just now';
  } else if (timeDifferenceInMs < 60000) {
    return Math.floor(timeDifferenceInMs / 1000) + ' seconds ago';
  } else if (timeDifferenceInMs < 120000) {
    return 'a minute ago';
  } else if (timeDifferenceInMs < 3600000) {
    return Math.floor(timeDifferenceInMs / 60000) + ' minutes ago';
  } else if (Math.floor(timeDifferenceInMs / 3600000) == 1) {
    return 'an hour ago';
  } else if (timeDifferenceInMs < 86400000) {
    return Math.floor(timeDifferenceInMs / 3600000) + ' hours ago';
  } else if (timeDifferenceInMs < 172800000) {
    return 'yesterday';
  }
  return Math.floor(timeDifferenceInMs / 86400000) + ' days ago';
}

const canvas = document.createElement('canvas');
const measurerContext = canvas.getContext('2d');

/**
 * Returns width of `text` rendered with Roboto at provided fontSize.
 */
export function measureTextWidth(text: string, fontSize: number): number {
  if (measurerContext)
    measurerContext.font = `${fontSize}px Roboto, sans-serif`;
  return measurerContext?.measureText(text).width!;
}

/**
 * Returns, if rendered `text` does not fit into maxWidth, truncated string with trailing
 * ellipsis.
 */
export function maybeTruncateString(
  text: string,
  fontSize: number,
  maxWidth: number
): string {
  if (!text) return '';
  if (measureTextWidth(text, fontSize) <= maxWidth) return text;

  let start = 0;
  let end = text.length;
  while (start < end) {
    const middle = start + Math.round((end - start) / 2);
    const substring = text.slice(0, middle) + '…';
    if (measureTextWidth(substring, fontSize) <= maxWidth) {
      start = middle;
    } else {
      end = middle - 1;
    }
  }

  return start === 0 ? text[0] : text.slice(0, start) + '…';
}

/**
 * Extend this subclass to receive event dispatching traits.
 * Useful for when various locations need to observe changes on
 * a common instance, who has a limited lifetime.
 *
 * This is not intended for use with framework-supported elements.
 * For example, prefer using `@Output myEmitter` on Angular
 * Components, or Polymer's `on-myprop-changed` for Polymer
 * elements, instead.
 *
 * Example usage:
 *
 * ```
 * export enum ReactorEvent {EXPLODED}
 * export class Reactor extends Dispatcher<ReactorEvent> {
 *   _update() {
 *     this.dispatchEvent(ReactorEvent.EXPLODED);
 *   }
 * }
 *
 * // Elsewhere
 * const r = new Reactor();
 * r.addEventListener(ReactorEvent.EXPLODED, this._cleanup);
 * ```
 */
export class Dispatcher<EventType = any> {
  private eventTypeToListeners = new Map<EventType, Function[]>();

  private getListeners(eventType) {
    if (!this.eventTypeToListeners.has(eventType)) {
      this.eventTypeToListeners.set(eventType, []);
    }
    return this.eventTypeToListeners.get(eventType);
  }

  addListener(eventType: EventType, listener: Function) {
    this.getListeners(eventType)?.push(listener);
  }

  removeListener(eventType: EventType, listener: Function) {
    const newListeners = this.getListeners(eventType)?.filter((x) => {
      return x !== listener;
    });
    this.eventTypeToListeners.set(eventType, newListeners!);
  }

  dispatchEvent(eventType: EventType, payload?: any) {
    for (const listener of this.getListeners(eventType)!) {
      listener(payload);
    }
  }
}
