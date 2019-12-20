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
"""An implementation of DataProvider that serves tfdbg v2 data. 

This implementation is:
  1. Based on reading data from a DebugEvent file set on the local filesystem.
  2. Implements only the relevant methods for the debugger v2 plugin, including
     - list_runs()
     - read_blob_sequences()
     - read_blob()
"""

from tensorboard.data import provider


DEFAULT_DEBUGGER_RUN_NAME = "__default_debugger_run__"


class LocalDebuggerV2DataProvider(provider.DataProvider):
    """A DataProvider implementation for tfdbg v2 data on local filesystem.

    In this implementation, `experiment_id` is assumed to be the path to the
    logdir that contains the DebugEvent file set.
    """

    def __init__(self):
        super(LocalDebuggerV2DataProvider, self).__init__()

        # Mapping experiment_id (logdir) to a reader for the debugger data.
        self._readers = dict()

    def list_runs(self, experiment_id):
        """List runs available.

        Args:
          experiment_id: currently used to pass the logdir path.

        Returns:
          Run names as a list of str.
        """
        logdir = experiment_id
        runs = []
        try:
            from tensorflow.python.debug.lib import debug_events_reader

            # TODO(cais): Switch DebugDataReader when available.
            self._readers[logdir] = debug_events_reader.DebugEventsReader(
                logdir
            )
            # NOTE(cais): Currently each logdir is enforced to have only one
            # DebugEvent file set. So we add hard-coded default run name.
            runs.append(DEFAULT_DEBUGGER_RUN_NAME)
        except ValueError as error:
            # When no DebugEvent file set is found in the logdir, a `ValueError`
            # is thrown.
            pass
        return runs

    def list_scalars(self, experiment_id, plugin_name, run_tag_filter=None):
        del experiment_id, plugin_name, run_tag_filter  # Unused.
        raise ValueError("Debugger V2 DataProvider doesn't support scalars.")

    def read_scalars(
        self, experiment_id, plugin_name, downsample=None, run_tag_filter=None
    ):
        del experiment_id, plugin_name, downsample, run_tag_filter
        raise ValueError("Debugger V2 DataProvider doesn't support scalars.")

    def list_blob_sequences(
        self, experiment_id, plugin_name, run_tag_filter=None
    ):
        del experiment_id, plugin_name, run_tag_filter  # Unused currently.
        # TODO(cais): Implement this.
        raise NotImplementedError()

    def read_blob(self, blob_key):
        del blob_key  # Unused currently.
        # TODO(cais): Implement this.
        raise NotImplementedError()
