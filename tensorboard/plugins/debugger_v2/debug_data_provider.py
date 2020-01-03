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

This class is a short-term hack. To be used in production, it awaits integration
with a more complete implementation of DataProvider such as
MultiplexerDataProvider.
"""

import json

from tensorboard.data import provider

from tensorboard.plugins.debugger_v2 import debug_data_multiplexer


DEBUGGER_V2_PLUGIN_NAME = "debugger-v2"


EXECUTION_DIGESTS_BOOK_BLOB_TAG = "execution_digests_book"
EXECUTION_DIGESTS_BOOK_PAGE_TAG = "execution_digests_page"
STACK_FRAMES_BLOB_TAG_PREFIX = "stack_frames_"
SOURCE_FILES_BLOB_TAG = "source_files"


class LocalDebuggerV2DataProvider(provider.DataProvider):
    """A DataProvider implementation for tfdbg v2 data on local filesystem.

    In this implementation, `experiment_id` is assumed to be the path to the
    logdir that contains the DebugEvent file set.
    """

    def __init__(self, logdir):
        """Constructor of LocalDebuggerV2DataProvider.

        Args:
          logdir: Path to the directory from which the tfdbg v2 data will be
            loaded.
        """
        super(LocalDebuggerV2DataProvider, self).__init__()
        self._multiplexer = debug_data_multiplexer.DebuggerV2EventMultiplexer(
            logdir
        )

    def list_runs(self, experiment_id):
        """List runs available.

        Args:
          experiment_id: currently unused, because the backing
            DebuggerV2EventMultiplexer does not accommodate multiple experiments.

        Returns:
          Run names as a list of str.
        """
        return [
            provider.Run(
                run_id=run,  # use names as IDs
                run_name=run,
                start_time=self._get_first_event_timestamp(run),
            )
            for run in self._multiplexer.Runs()
        ]

    def _get_first_event_timestamp(self, run_name):
        try:
            return self._multiplexer.FirstEventTimestamp(run_name)
        except ValueError as e:
            return None

    def list_scalars(self, experiment_id, plugin_name, run_tag_filter=None):
        del experiment_id, plugin_name, run_tag_filter  # Unused.
        raise TypeError("Debugger V2 DataProvider doesn't support scalars.")

    def read_scalars(
        self, experiment_id, plugin_name, downsample=None, run_tag_filter=None
    ):
        del experiment_id, plugin_name, downsample, run_tag_filter
        raise TypeError("Debugger V2 DataProvider doesn't support scalars.")

    def list_blob_sequences(
        self, experiment_id, plugin_name, run_tag_filter=None
    ):
        del experiment_id, plugin_name, run_tag_filter  # Unused currently.
        # TODO(cais): Implement this.
        raise NotImplementedError()

    def read_blob_sequences(
        self, experiment_id, plugin_name, downsample=None, run_tag_filter=None
    ):
        del experiment_id, downsample, run_tag_filter  # Unused.
        if plugin_name != DEBUGGER_V2_PLUGIN_NAME:
            raise ValueError("Unsupported plugin_name: %s" % plugin_name)
        if not run_tag_filter.runs:
            raise ValueError(
                "run_tag_filter.runs is expected to be specified, but is not.")
        if len(run_tag_filter.runs) != 1:
            raise ValueError(
                "run_tag_filter.runs is expected to have length 1, "
                "but instead has length %d" % len(run_tag_filter.tags))
        if not run_tag_filter:
            raise ValueError(
                "run_tag_filter is expected to be specified, but is not.")
        if not run_tag_filter.tags:
            raise ValueError(
                "run_tag_filter.tags is expected to be specified, but is not.")
        if len(run_tag_filter.tags) != 1:
            raise ValueError(
                "run_tag_filter.tags is expected to have length 1, "
                "but instead has length %d" % len(run_tag_filter.tags))

        run = next(iter(run_tag_filter.runs))
        tag = next(iter(run_tag_filter.tags))
        # TODO(cais): Can we do a loop here instead and relax the len == 1
        # requirement?

        if run in self._multiplexer.Runs():
            if tag == EXECUTION_DIGESTS_BOOK_BLOB_TAG:
                blob_ref = provider.BlobReference(
                    blob_key="tag.%s" % run)
                output = {
                    run: {
                        EXECUTION_DIGESTS_BOOK_BLOB_TAG: [blob_ref]
                    }
                }
                return output

            else:
                raise ValueError("Unrecognized tag: %s" % tag)
        else:
            return {}

    def read_blob(self, blob_key):
        if blob_key.startswith(EXECUTION_DIGESTS_BOOK_BLOB_TAG + "."):
            run = blob_key[len(EXECUTION_DIGESTS_BOOK_BLOB_TAG) + 1:]
            return json.dumps(self._multiplexer.ExecutionDigestsBook(run))
        else:
            raise ValueError("Unrecognized blob_key: %s" % key)

