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
var tf;
(function (tf) {
    var graph;
    (function (graph) {
        var util;
        (function (util) {
            /**
             * Recommended delay (ms) when running an expensive task asynchronously
             * that gives enough time for the progress bar to update its UI.
             */
            var ASYNC_TASK_DELAY = 20;
            function time(msg, task) {
                var start = Date.now();
                var result = task();
                /* tslint:disable */
                console.log(msg, ':', Date.now() - start, 'ms');
                /* tslint:enable */
                return result;
            }
            util.time = time;
            /**
             * Creates a tracker that sets the progress property of the
             * provided polymer component. The provided component must have
             * a property called 'progress' that is not read-only. The progress
             * property is an object with a numerical 'value' property and a
             * string 'msg' property.
             */
            function getTracker(polymerComponent) {
                return {
                    setMessage: function (msg) {
                        polymerComponent.set('progress', { value: polymerComponent.progress.value, msg: msg });
                    },
                    updateProgress: function (value) {
                        polymerComponent.set('progress', {
                            value: polymerComponent.progress.value + value,
                            msg: polymerComponent.progress.msg
                        });
                    },
                    reportError: function (msg, err) {
                        // Log the stack trace in the console.
                        console.error(err.stack);
                        // And send a user-friendly message to the UI.
                        polymerComponent.set('progress', { value: polymerComponent.progress.value, msg: msg, error: true });
                    },
                };
            }
            util.getTracker = getTracker;
            /**
             * Creates a tracker for a subtask given the parent tracker, the total
             * progress
             * of the subtask and the subtask message. The parent task should pass a
             * subtracker to its subtasks. The subtask reports its own progress which
             * becomes relative to the main task.
             */
            function getSubtaskTracker(parentTracker, impactOnTotalProgress, subtaskMsg) {
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
                        parentTracker.updateProgress(incrementValue * impactOnTotalProgress / 100);
                    },
                    reportError: function (msg, err) {
                        // The parent should show a concatenation of its message along with
                        // its subtask error message.
                        parentTracker.reportError(subtaskMsg + ': ' + msg, err);
                    }
                };
            }
            util.getSubtaskTracker = getSubtaskTracker;
            /**
             * Runs an expensive task and return the result.
             */
            function runTask(msg, incProgressValue, task, tracker) {
                // Update the progress message to say the current running task.
                tracker.setMessage(msg);
                // Run the expensive task with a delay that gives enough time for the
                // UI to update.
                try {
                    var result = tf.graph.util.time(msg, task);
                    // Update the progress value.
                    tracker.updateProgress(incProgressValue);
                    // Return the result to be used by other tasks.
                    return result;
                }
                catch (e) {
                    // Errors that happen inside asynchronous tasks are
                    // reported to the tracker using a user-friendly message.
                    tracker.reportError('Failed ' + msg, e);
                }
            }
            util.runTask = runTask;
            /**
             * Runs an expensive task asynchronously and returns a promise of the result.
             */
            function runAsyncTask(msg, incProgressValue, task, tracker) {
                return new Promise(function (resolve, reject) {
                    // Update the progress message to say the current running task.
                    tracker.setMessage(msg);
                    // Run the expensive task with a delay that gives enough time for the
                    // UI to update.
                    setTimeout(function () {
                        try {
                            var result = tf.graph.util.time(msg, task);
                            // Update the progress value.
                            tracker.updateProgress(incProgressValue);
                            // Return the result to be used by other tasks.
                            resolve(result);
                        }
                        catch (e) {
                            // Errors that happen inside asynchronous tasks are
                            // reported to the tracker using a user-friendly message.
                            tracker.reportError('Failed ' + msg, e);
                        }
                    }, ASYNC_TASK_DELAY);
                });
            }
            util.runAsyncTask = runAsyncTask;
            /**
             * Asynchronously runs an expensive task that returns a promise. Updates the
             * tracker's progress after the promise resolves. Returns a new promise that
             * resolves after the progress is updated.
             */
            function runAsyncPromiseTask(msg, incProgressValue, task, tracker) {
                return new Promise(function (resolve, reject) {
                    var handleError = function (e) {
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
                            var start_1 = Date.now();
                            task()
                                .then(function (value) {
                                /* tslint:disable */
                                console.log(msg, ':', Date.now() - start_1, 'ms');
                                // Update the progress value.
                                tracker.updateProgress(incProgressValue);
                                // Return the result to be used by other tasks.
                                resolve(value);
                            })
                                .catch(handleError);
                        }
                        catch (e) {
                            handleError(e);
                        }
                    }, ASYNC_TASK_DELAY);
                });
            }
            util.runAsyncPromiseTask = runAsyncPromiseTask;
            /**
             * Returns a query selector with escaped special characters that are not
             * allowed in a query selector.
             */
            function escapeQuerySelector(querySelector) {
                return querySelector.replace(/([:.\[\],/\\\(\)])/g, '\\$1');
            }
            util.escapeQuerySelector = escapeQuerySelector;
            // For unit conversion.
            util.MEMORY_UNITS = [
                // Atomic unit.
                { symbol: 'B' },
                // numUnits specifies how many previous units this unit contains.
                { symbol: 'KB', numUnits: 1024 }, { symbol: 'MB', numUnits: 1024 },
                { symbol: 'GB', numUnits: 1024 }, { symbol: 'TB', numUnits: 1024 },
                { symbol: 'PB', numUnits: 1024 }
            ];
            util.TIME_UNITS = [
                // Atomic unit. Finest granularity in TensorFlow stat collection.
                { symbol: 'µs' },
                // numUnits specifies how many previous units this unit contains.
                { symbol: 'ms', numUnits: 1000 }, { symbol: 's', numUnits: 1000 },
                { symbol: 'min', numUnits: 60 }, { symbol: 'hr', numUnits: 60 },
                { symbol: 'days', numUnits: 24 }
            ];
            /**
             * Returns the human readable version of the unit.
             * (e.g. 1.35 GB, 23 MB, 34 ms, 6.53 min etc).
             */
            function convertUnitsToHumanReadable(value, units, unitIndex) {
                unitIndex = unitIndex == null ? 0 : unitIndex;
                if (unitIndex + 1 < units.length &&
                    value >= units[unitIndex + 1].numUnits) {
                    return tf.graph.util.convertUnitsToHumanReadable(value / units[unitIndex + 1].numUnits, units, unitIndex + 1);
                }
                // toPrecision() has the tendency to return a number in scientific
                // notation and (number - 0) brings it back to normal notation.
                return (value.toPrecision(3) - 0) + ' ' + units[unitIndex].symbol;
            }
            util.convertUnitsToHumanReadable = convertUnitsToHumanReadable;
            function hasDisplayableNodeStats(stats) {
                if (stats &&
                    (stats.totalBytes > 0 || stats.getTotalMicros() > 0 ||
                        stats.outputSize)) {
                    return true;
                }
                return false;
            }
            util.hasDisplayableNodeStats = hasDisplayableNodeStats;
            /**
             * Given a list of strings, it returns a new list of strings with the longest
             * common prefix removed. If the common prefix is one of the strings in the
             * list, it returns the original strings.
             */
            function removeCommonPrefix(strings) {
                if (strings.length < 2) {
                    return strings;
                }
                var index = 0;
                var largestIndex = 0;
                // Find the shortest name across all strings.
                var minLength = _.min(_.map(strings, function (str) { return str.length; }));
                var _loop_1 = function () {
                    index++;
                    var prefixes = _.map(strings, function (str) { return str.substring(0, index); });
                    var allTheSame = prefixes.every(function (prefix, i) {
                        return (i === 0 ? true : prefix === prefixes[i - 1]);
                    });
                    if (allTheSame) {
                        if (index >= minLength) {
                            return { value: strings };
                        }
                        largestIndex = index;
                    }
                    else {
                        return "break";
                    }
                };
                while (true) {
                    var state_1 = _loop_1();
                    if (typeof state_1 === "object")
                        return state_1.value;
                    if (state_1 === "break")
                        break;
                }
                return _.map(strings, function (str) { return str.substring(largestIndex); });
            }
            util.removeCommonPrefix = removeCommonPrefix;
            /**
             * Given a queryString, aka ?foo=1&bar=2, return the object representation.
             */
            function getQueryParams(queryString) {
                if (queryString.charAt(0) === '?') {
                    queryString = queryString.slice(1);
                }
                var queryParams = _.chain(queryString.split('&'))
                    .map(function (item) {
                    if (item) {
                        return item.split('=');
                    }
                })
                    .compact()
                    .value();
                return _.object(queryParams);
            }
            util.getQueryParams = getQueryParams;
            /**
             * Given a timestamp in microseconds, return a human-friendly string denoting
             * how long ago the timestamp was.
             */
            function computeHumanFriendlyTime(timeInMicroseconds) {
                var timeDifferenceInMs = +(new Date()) - +(new Date(timeInMicroseconds / 1e3));
                if (timeDifferenceInMs < 30000) {
                    return 'just now';
                }
                else if (timeDifferenceInMs < 60000) {
                    return Math.floor(timeDifferenceInMs / 1000) + ' seconds ago';
                }
                else if (timeDifferenceInMs < 120000) {
                    return 'a minute ago';
                }
                else if (timeDifferenceInMs < 3600000) {
                    return Math.floor(timeDifferenceInMs / 60000) + ' minutes ago';
                }
                else if (Math.floor(timeDifferenceInMs / 3600000) == 1) {
                    return 'an hour ago';
                }
                else if (timeDifferenceInMs < 86400000) {
                    return Math.floor(timeDifferenceInMs / 3600000) + ' hours ago';
                }
                else if (timeDifferenceInMs < 172800000) {
                    return 'yesterday';
                }
                return Math.floor(timeDifferenceInMs / 86400000) + ' days ago';
            }
            util.computeHumanFriendlyTime = computeHumanFriendlyTime;
        })(util = graph.util || (graph.util = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {}));
