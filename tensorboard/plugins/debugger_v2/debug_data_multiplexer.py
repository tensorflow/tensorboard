# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""A wrapper around DebugDataReader used for retrieving tfdbg v2 data."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import threading

from tensorboard import errors

# Dummy run name for the debugger.
# Currently, the `DebuggerV2ExperimentMultiplexer` class is tied to a single
# logdir, which holds at most one DebugEvent file set in the tfdbg v2 (tfdbg2
# for short) format.
# TODO(cais): When tfdbg2 allows there to be multiple DebugEvent file sets in
# the same logdir, replace this magic string with actual run names.
DEFAULT_DEBUGGER_RUN_NAME = "__default_debugger_run__"

# Default number of alerts per monitor type.
# Limiting the number of alerts is based on the consideration that usually
# only the first few alerting events are the most critical and the subsequent
# ones are either repetitions of the earlier ones or caused by the earlier ones.
DEFAULT_PER_TYPE_ALERT_LIMIT = 1000


def run_in_background(target):
    """Run a target task in the background.

    In the context of this module, `target` is the `update()` method of the
    underlying reader for tfdbg2-format data.
    This method is mocked by unit tests for deterministic behaviors during
    testing.

    Args:
      target: The target task to run in the background, a callable with no args.
    """
    # TODO(cais): Implement repetition with sleeping periods in between.
    # TODO(cais): Add more unit tests in debug_data_multiplexer_test.py when the
    # the behavior gets more complex.
    thread = threading.Thread(target=target)
    thread.start()


def _alert_to_json(alert):
    # TODO(cais): Replace this with Alert.to_json() when supported by the
    # backend.
    from tensorflow.python.debug.lib import debug_events_monitors

    if isinstance(alert, debug_events_monitors.InfNanAlert):
        return {
            "alert_type": "InfNanAlert",
            "op_type": alert.op_type,
            "output_slot": alert.output_slot,
            # TODO(cais): Once supported by backend, add 'op_name' key
            # for intra-graph execution events.
            "size": alert.size,
            "num_neg_inf": alert.num_neg_inf,
            "num_pos_inf": alert.num_pos_inf,
            "num_nan": alert.num_nan,
            "execution_index": alert.execution_index,
            "graph_execution_trace_index": alert.graph_execution_trace_index,
        }
    else:
        raise TypeError("Unrecognized alert subtype: %s" % type(alert))


class DebuggerV2EventMultiplexer(object):
    """A class used for accessing tfdbg v2 DebugEvent data on local filesystem.

    This class is a short-term hack, mirroring the EventMultiplexer for the main
    TensorBoard plugins (e.g., scalar, histogram and graphs.) As such, it only
    implements the methods relevant to the Debugger V2 pluggin.

    TODO(cais): Integrate it with EventMultiplexer and use the integrated class
    from MultiplexerDataProvider for a single path of accessing debugger and
    non-debugger data.
    """

    def __init__(self, logdir):
        """Constructor for the `DebugEventMultiplexer`.

        Args:
          logdir: Path to the directory to load the tfdbg v2 data from.
        """
        self._logdir = logdir
        self._reader = None

    def FirstEventTimestamp(self, run):
        """Return the timestamp of the first DebugEvent of the given run.

        This may perform I/O if no events have been loaded yet for the run.

        Args:
          run: A string name of the run for which the timestamp is retrieved.
            This currently must be hardcoded as `DEFAULT_DEBUGGER_RUN_NAME`,
            as each logdir contains at most one DebugEvent file set (i.e., a
            run of a tfdbg2-instrumented TensorFlow program.)

        Returns:
            The wall_time of the first event of the run, which will be in seconds
            since the epoch as a `float`.
        """
        if self._reader is None:
            raise ValueError("No tfdbg2 runs exists.")
        if run != DEFAULT_DEBUGGER_RUN_NAME:
            raise ValueError(
                "Expected run name to be %s, but got %s"
                % (DEFAULT_DEBUGGER_RUN_NAME, run)
            )
        return self._reader.starting_wall_time()

    def PluginRunToTagToContent(self, plugin_name):
        raise NotImplementedError(
            "DebugDataMultiplexer.PluginRunToTagToContent() has not been "
            "implemented yet."
        )

    def Runs(self):
        """Return all the run names in the `EventMultiplexer`.

        The `Run()` method of this class is specialized for the tfdbg2-format
        DebugEvent files. It only returns runs

        Returns:
        If tfdbg2-format data exists in the `logdir` of this object, returns:
            ```
            {runName: { "debugger-v2": [tag1, tag2, tag3] } }
            ```
            where `runName` is the hard-coded string `DEFAULT_DEBUGGER_RUN_NAME`
            string. This is related to the fact that tfdbg2 currently contains
            at most one DebugEvent file set per directory.
        If no tfdbg2-format data exists in the `logdir`, an empty `dict`.
        """
        if self._reader is None:
            try:
                from tensorflow.python.debug.lib import debug_events_reader
                from tensorflow.python.debug.lib import debug_events_monitors

                self._reader = debug_events_reader.DebugDataReader(self._logdir)
                self._monitors = [
                    debug_events_monitors.InfNanMonitor(
                        self._reader, limit=DEFAULT_PER_TYPE_ALERT_LIMIT
                    )
                ]
                # NOTE(cais): Currently each logdir is enforced to have only one
                # DebugEvent file set. So we add hard-coded default run name.
                run_in_background(self._reader.update)
                # TODO(cais): Start off a reading thread here, instead of being
                # called only once here.
            except ImportError:
                # This ensures graceful behavior when tensorflow install is
                # unavailable.
                return {}
            except AttributeError:
                # Gracefully fail for users without the required API changes to
                # debug_events_reader.DebugDataReader introduced in
                # TF 2.1.0.dev20200103. This should be safe to remove when
                # TF 2.2 is released.
                return {}
            except ValueError:
                # When no DebugEvent file set is found in the logdir, a
                # `ValueError` is thrown.
                return {}

        return {
            DEFAULT_DEBUGGER_RUN_NAME: {
                # TODO(cais): Add the semantically meaningful tag names such as
                # 'execution_digests_book', 'alerts_book'
                "debugger-v2": []
            }
        }

    def _checkBeginEndIndices(self, begin, end, total_count):
        if begin < 0:
            raise errors.InvalidArgumentError(
                "Invalid begin index (%d)" % begin
            )
        if end > total_count:
            raise errors.InvalidArgumentError(
                "end index (%d) out of bounds (%d)" % (end, total_count)
            )
        if end >= 0 and end < begin:
            raise errors.InvalidArgumentError(
                "end index (%d) is unexpectedly less than begin index (%d)"
                % (end, begin)
            )
        if end < 0:  # This means all digests.
            end = total_count
        return end

    def Alerts(self, run, begin, end, alert_type_filter=None):
        """Get alerts from the debugged TensorFlow program.

        Args:
          run: The tfdbg2 run to get Alerts from.
          begin: Beginning alert index.
          end: Ending alert index.
          alert_type_filter: Optional filter string for alert type, used to
            restrict retrieved alerts data to a single type. If used,
            `begin` and `end` refer to the beginning and ending indices within
            the filtered alert type.
        """
        from tensorflow.python.debug.lib import debug_events_monitors

        runs = self.Runs()
        if run not in runs:
            return None
        alerts = []
        alerts_breakdown = dict()
        alerts_by_type = dict()
        for monitor in self._monitors:
            monitor_alerts = monitor.alerts()
            if not monitor_alerts:
                continue
            alerts.extend(monitor_alerts)
            # TODO(cais): Replace this with Alert.to_json() when
            # monitor.alert_type() is available.
            if isinstance(monitor, debug_events_monitors.InfNanMonitor):
                alert_type = "InfNanAlert"
            else:
                alert_type = "__MiscellaneousAlert__"
            alerts_breakdown[alert_type] = len(monitor_alerts)
            alerts_by_type[alert_type] = monitor_alerts
        num_alerts = len(alerts)
        if alert_type_filter is not None:
            if alert_type_filter not in alerts_breakdown:
                raise errors.InvalidArgumentError(
                    "Filtering of alerts failed: alert type %s does not exist"
                    % alert_type_filter
                )
            alerts = alerts_by_type[alert_type_filter]
        end = self._checkBeginEndIndices(begin, end, len(alerts))
        return {
            "begin": begin,
            "end": end,
            "alert_type": alert_type_filter,
            "num_alerts": num_alerts,
            "alerts_breakdown": alerts_breakdown,
            "per_type_alert_limit": DEFAULT_PER_TYPE_ALERT_LIMIT,
            "alerts": [_alert_to_json(alert) for alert in alerts[begin:end]],
        }

    def ExecutionDigests(self, run, begin, end):
        """Get ExecutionDigests.

        Args:
          run: The tfdbg2 run to get `ExecutionDigest`s from.
          begin: Beginning execution index.
          end: Ending execution index.

        Returns:
          A JSON-serializable object containing the `ExecutionDigest`s and
          related meta-information
        """
        runs = self.Runs()
        if run not in runs:
            return None
        # TODO(cais): For scalability, use begin and end kwargs when available in
        # `DebugDataReader.execution()`.`
        execution_digests = self._reader.executions(digest=True)
        end = self._checkBeginEndIndices(begin, end, len(execution_digests))
        return {
            "begin": begin,
            "end": end,
            "num_digests": len(execution_digests),
            "execution_digests": [
                digest.to_json() for digest in execution_digests[begin:end]
            ],
        }

    def ExecutionData(self, run, begin, end):
        """Get Execution data objects (Detailed, non-digest form).

        Args:
          run: The tfdbg2 run to get `ExecutionDigest`s from.
          begin: Beginning execution index.
          end: Ending execution index.

        Returns:
          A JSON-serializable object containing the `ExecutionDigest`s and
          related meta-information
        """
        runs = self.Runs()
        if run not in runs:
            return None
        # TODO(cais): For scalability, use begin and end kwargs when available in
        # `DebugDataReader.execution()`.`
        execution_digests = self._reader.executions(digest=True)
        end = self._checkBeginEndIndices(begin, end, len(execution_digests))
        execution_digests = execution_digests[begin:end]
        executions = [
            self._reader.read_execution(digest) for digest in execution_digests
        ]
        return {
            "begin": begin,
            "end": end,
            "executions": [execution.to_json() for execution in executions],
        }

    def GraphExecutionDigests(self, run, begin, end, trace_id=None):
        """Get `GraphExecutionTraceDigest`s.

        Args:
          run: The tfdbg2 run to get `GraphExecutionDigest`s from.
          begin: Beginning graph-execution index.
          end: Ending graph-execution index.

        Returns:
          A JSON-serializable object containing the `ExecutionDigest`s and
          related meta-information
        """
        runs = self.Runs()
        if run not in runs:
            return None
        # TODO(cais): Implement support for trace_id once the joining of eager
        # execution and intra-graph execution is supported by DebugDataReader.
        if trace_id is not None:
            raise NotImplementedError(
                "trace_id support for GraphExecutoinTraceDigest is "
                "not implemented yet."
            )
        graph_exec_digests = self._reader.graph_execution_traces(digest=True)
        end = self._checkBeginEndIndices(begin, end, len(graph_exec_digests))
        return {
            "begin": begin,
            "end": end,
            "num_digests": len(graph_exec_digests),
            "graph_execution_digests": [
                digest.to_json() for digest in graph_exec_digests[begin:end]
            ],
        }

    # TODO(cais): Add GraphExecutionTraceData().

    def SourceFileList(self, run):
        runs = self.Runs()
        if run not in runs:
            return None
        return self._reader.source_file_list()

    def SourceLines(self, run, index):
        runs = self.Runs()
        if run not in runs:
            return None
        try:
            host_name, file_path = self._reader.source_file_list()[index]
        except IndexError:
            raise errors.NotFoundError(
                "There is no source-code file at index %d" % index
            )
        return {
            "host_name": host_name,
            "file_path": file_path,
            "lines": self._reader.source_lines(host_name, file_path),
        }

    def StackFrames(self, run, stack_frame_ids):
        runs = self.Runs()
        if run not in runs:
            return None
        stack_frames = []
        for stack_frame_id in stack_frame_ids:
            if stack_frame_id not in self._reader._stack_frame_by_id:
                raise errors.NotFoundError(
                    "Cannot find stack frame with ID %s" % stack_frame_id
                )
            # TODO(cais): Use public method (`stack_frame_by_id()`) when
            # available.
            # pylint: disable=protected-access
            stack_frames.append(self._reader._stack_frame_by_id[stack_frame_id])
            # pylint: enable=protected-access
        return {"stack_frames": stack_frames}
