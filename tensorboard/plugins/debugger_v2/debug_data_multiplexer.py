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

# Dummy run name for the debugger.
# Currently, the `DebuggerV2ExperimentMultiplexer` class is tied to a single
# logdir, which holds at most one DebugEvent file set in the tfdbg v2 (tfdbg2
# for short) format.
# TODO(cais): When tfdbg2 allows there to be multiple DebugEvent file sets in
# the same logdir, replace this magic string with actual run names.
DEFAULT_DEBUGGER_RUN_NAME = "__default_debugger_run__"


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
        # TODO(cais): Start off a reading thread here.

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
        if run != DEFAULT_DEBUGGER_RUN_NAME:
            raise ValueError(
                "Expected run name to be %s, but got %s"
                % (DEFAULT_DEBUGGER_RUN_NAME, run)
            )
        from tensorflow.python.debug.lib import debug_events_reader

        with debug_events_reader.DebugEventsReader(self._logdir) as reader:
            metadata_iterator, _ = reader.metadata_iterator()
            return next(metadata_iterator).wall_time

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
        reader = None
        from tensorflow.python.debug.lib import debug_events_reader

        try:
            reader = debug_events_reader.DebugDataReader(self._logdir)
            # NOTE(cais): Currently each logdir is enforced to have only one
            # DebugEvent file set. So we add hard-coded default run name.
        except ValueError as error:
            # When no DebugEvent file set is found in the logdir, a `ValueError`
            # is thrown.
            return {}
        with reader:
            return {
                DEFAULT_DEBUGGER_RUN_NAME: {
                    # TODO(cais): Add the semantically meaningful tag names such as
                    # 'execution_digests_book', 'alerts_book'
                    "debugger-v2": []
                }
            }
