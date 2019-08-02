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
 * @fileoverview Utility functions for the TensorFlow profile plugin.
 */

module tf.profile.util {
  /**
   * Tracks task progress. Each task being passed a progress tracker needs
   * to call the below-defined methods to notify the caller about the gradual
   * progress of the task.
   */
  export interface ProgressTracker {
    updateProgress(incrementValue: number): void;
    setMessage(msg: string): void;
    reportError(msg: string, err: Error): void;
  }

  export function time<T>(msg: string, task: () => T) {
    let start = Date.now();
    let result = task();
    /* tslint:disable */
    console.log(msg, ':', Date.now() - start, 'ms');
    /* tslint:enable */
    return result;
  }

  /**
   * Creates a tracker that sets the progress property of the
   * provided polymer component. The provided component must have
   * a property called 'progress' that is not read-only. The progress
   * property is an object with a numerical 'value' property and a
   * string 'msg' property.
   */
  export function getTracker(polymerComponent: any) {
    return {
      setMessage: function(msg) {
        polymerComponent.set(
            'progress', {value: polymerComponent.progress.value, msg: msg});
      },
      updateProgress: function(value) {
        polymerComponent.set('progress', {
          value: polymerComponent.progress.value + value,
          msg: polymerComponent.progress.msg
        });
      },
      reportError: function(msg: string, err) {
        // Log the stack trace in the console.
        console.error(err.stack);
        // And send a user-friendly message to the UI.
        polymerComponent.set(
            'progress',
            {value: polymerComponent.progress.value, msg: msg, error: true});
      },
    };
  }

  /**
   * Runs an expensive task and return the result.
   */
  export function runTask<T>(
      msg: string, incProgressValue: number, task: () => T,
      tracker: ProgressTracker): T {
    // Update the progress message to say the current running task.
    tracker.setMessage(msg);
    // Run the expensive task with a delay that gives enough time for the
    // UI to update.
    try {
      let result = tf.profile.util.time(msg, task);
      // Update the progress value.
      tracker.updateProgress(incProgressValue);
      // Return the result to be used by other tasks.
      return result;
    } catch (e) {
      // Errors that happen inside asynchronous tasks are
      // reported to the tracker using a user-friendly message.
      tracker.reportError('Failed ' + msg, e);
    }
  }
}
