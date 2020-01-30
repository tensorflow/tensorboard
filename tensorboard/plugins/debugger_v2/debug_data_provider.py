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


PLUGIN_NAME = "debugger-v2"

ALERTS_BLOB_TAG_PREFIX = "alerts"
EXECUTION_DIGESTS_BLOB_TAG_PREFIX = "execution_digests"
EXECUTION_DATA_BLOB_TAG_PREFIX = "execution_data"
SOURCE_FILE_LIST_BLOB_TAG = "source_file_list"
SOURCE_FILE_BLOB_TAG_PREFIX = "source_file"
STACK_FRAMES_BLOB_TAG_PREFIX = "stack_frames"


def alerts_run_tag_filter(run, begin, end):
    """Create a RunTagFilter for Alerts.

    Args:
      run: tfdbg2 run name.
      begin: Beginning index of alerts.
      end: Ending index of alerts.

    Returns:
      `RunTagFilter` for the run and range of Alerts.
    """
    # TODO(cais): Add filter for alert type.
    return provider.RunTagFilter(
        runs=[run], tags=["%s_%d_%d" % (ALERTS_BLOB_TAG_PREFIX, begin, end)],
    )


def _parse_alerts_blob_key(blob_key):
    """Parse the BLOB key for Alerts.

    Args:
      blob_key: The BLOB key to parse. By contract, it should have the format:
       `${ALERTS_BLOB_TAG_PREFIX}_${begin}_${end}.${run_id}`

    Returns:
      - run ID
      - begin index
      - end index
    """
    # TODO(cais): Add filter for alert type.
    key_body, run = blob_key.split(".", 1)
    key_body = key_body[len(ALERTS_BLOB_TAG_PREFIX) :]
    begin = int(key_body.split("_")[1])
    end = int(key_body.split("_")[2])
    return run, begin, end


def execution_digest_run_tag_filter(run, begin, end):
    """Create a RunTagFilter for ExecutionDigests.

    This differs from `execution_data_run_tag_filter()` in that it is for
    the small-size digest objects for execution debug events, instead of the
    full-size data objects.

    Args:
      run: tfdbg2 run name.
      begin: Beginning index of ExecutionDigests.
      end: Ending index of ExecutionDigests.

    Returns:
      `RunTagFilter` for the run and range of ExecutionDigests.
    """
    return provider.RunTagFilter(
        runs=[run],
        tags=["%s_%d_%d" % (EXECUTION_DIGESTS_BLOB_TAG_PREFIX, begin, end)],
    )


def _parse_execution_digest_blob_key(blob_key):
    """Parse the BLOB key for ExecutionDigests.

    This differs from `_parse_execution_data_blob_key()` in that it is for
    the small-size digest objects for execution debug events, instead of the
    full-size data objects.

    Args:
      blob_key: The BLOB key to parse. By contract, it should have the format:
       `${EXECUTION_DIGESTS_BLOB_TAG_PREFIX}_${begin}_${end}.${run_id}`

    Returns:
      - run ID
      - begin index
      - end index
    """

    key_body, run = blob_key.split(".", 1)
    key_body = key_body[len(EXECUTION_DIGESTS_BLOB_TAG_PREFIX) :]
    begin = int(key_body.split("_")[1])
    end = int(key_body.split("_")[2])
    return run, begin, end


def execution_data_run_tag_filter(run, begin, end):
    """Create a RunTagFilter for Execution data objects.

    This differs from `execution_digest_run_tag_filter()` in that it is
    for the detailed data objects for execution, instead of the digests.

    Args:
      run: tfdbg2 run name.
      begin: Beginning index of Execution.
      end: Ending index of Execution.

    Returns:
      `RunTagFilter` for the run and range of ExecutionDigests.
    """
    return provider.RunTagFilter(
        runs=[run],
        tags=["%s_%d_%d" % (EXECUTION_DATA_BLOB_TAG_PREFIX, begin, end)],
    )


def _parse_execution_data_blob_key(blob_key):
    """Parse the BLOB key for Execution data objects.

    This differs from `_parse_execution_digest_blob_key()` in that it is
    for the deatiled data objects for execution, instead of the digests.

    Args:
      blob_key: The BLOB key to parse. By contract, it should have the format:
       `${EXECUTION_DATA_BLOB_TAG_PREFIX}_${begin}_${end}.${run_id}`

    Returns:
      - run ID
      - begin index
      - end index
    """
    key_body, run = blob_key.split(".", 1)
    key_body = key_body[len(EXECUTION_DATA_BLOB_TAG_PREFIX) :]
    begin = int(key_body.split("_")[1])
    end = int(key_body.split("_")[2])
    return run, begin, end


def source_file_list_run_tag_filter(run):
    """Create a RunTagFilter for listing source files.

    Args:
      run: tfdbg2 run name.

    Returns:
      `RunTagFilter` for listing the source files in the tfdbg2 run.
    """
    return provider.RunTagFilter(runs=[run], tags=[SOURCE_FILE_LIST_BLOB_TAG])


def _parse_source_file_list_blob_key(blob_key):
    """Parse the BLOB key for source file list.

    Args:
      blob_key: The BLOB key to parse. By contract, it should have the format:
       `${SOURCE_FILE_LIST_BLOB_TAG}.${run_id}`

    Returns:
      - run ID
    """
    return blob_key[blob_key.index(".") + 1 :]


def source_file_run_tag_filter(run, index):
    """Create a RunTagFilter for listing source files.

    Args:
      run: tfdbg2 run name.
      index: The index for the source file of which the content is to be
        accessed.

    Returns:
      `RunTagFilter` for accessing the content of the source file.
    """
    return provider.RunTagFilter(
        runs=[run], tags=["%s_%d" % (SOURCE_FILE_BLOB_TAG_PREFIX, index)],
    )


def _parse_source_file_blob_key(blob_key):
    """Parse the BLOB key for accessing the content of a source file.

    Args:
      blob_key: The BLOB key to parse. By contract, it should have the format:
       `${SOURCE_FILE_BLOB_TAG_PREFIX}_${index}.${run_id}`

    Returns:
      - run ID, as a str.
      - File index, as an int.
    """
    key_body, run = blob_key.split(".", 1)
    index = int(key_body[len(SOURCE_FILE_BLOB_TAG_PREFIX) + 1 :])
    return run, index


def stack_frames_run_tag_filter(run, stack_frame_ids):
    """Create a RunTagFilter for querying stack frames.

    Args:
      run: tfdbg2 run name.
      stack_frame_ids: The stack_frame_ids being requested.

    Returns:
      `RunTagFilter` for accessing the content of the source file.
    """
    return provider.RunTagFilter(
        runs=[run],
        # The stack-frame IDS are UUIDs, which do not contain underscores.
        # Hence it's safe to concatenate them with underscores.
        tags=[STACK_FRAMES_BLOB_TAG_PREFIX + "_" + "_".join(stack_frame_ids)],
    )


def _parse_stack_frames_blob_key(blob_key):
    """Parse the BLOB key for source file list.

    Args:
      blob_key: The BLOB key to parse. By contract, it should have the format:
       `${STACK_FRAMES_BLOB_TAG_PREFIX}_` +
       `${stack_frame_id_0}_..._${stack_frame_id_N}.${run_id}`

    Returns:
      - run ID
      - The stack frame IDs as a tuple of strings.
    """
    key_body, run = blob_key.split(".", 1)
    key_body = key_body[len(STACK_FRAMES_BLOB_TAG_PREFIX) + 1 :]
    stack_frame_ids = key_body.split("_")
    return run, stack_frame_ids


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
        del experiment_id, downsample  # Unused.
        if plugin_name != PLUGIN_NAME:
            raise ValueError("Unsupported plugin_name: %s" % plugin_name)
        if run_tag_filter.runs is None:
            raise ValueError(
                "run_tag_filter.runs is expected to be specified, but is not."
            )
        if run_tag_filter.tags is None:
            raise ValueError(
                "run_tag_filter.tags is expected to be specified, but is not."
            )

        output = dict()
        existing_runs = self._multiplexer.Runs()
        for run in run_tag_filter.runs:
            if run not in existing_runs:
                continue
            output[run] = dict()
            for tag in run_tag_filter.tags:
                if tag.startswith(
                    (
                        ALERTS_BLOB_TAG_PREFIX,
                        EXECUTION_DIGESTS_BLOB_TAG_PREFIX,
                        EXECUTION_DATA_BLOB_TAG_PREFIX,
                        SOURCE_FILE_BLOB_TAG_PREFIX,
                        STACK_FRAMES_BLOB_TAG_PREFIX,
                    )
                ) or tag in (SOURCE_FILE_LIST_BLOB_TAG,):
                    output[run][tag] = [
                        provider.BlobReference(blob_key="%s.%s" % (tag, run))
                    ]
        return output

    def read_blob(self, blob_key):
        if blob_key.startswith(ALERTS_BLOB_TAG_PREFIX):
            run, begin, end = _parse_alerts_blob_key(blob_key)
            return json.dumps(self._multiplexer.Alerts(run, begin, end))
        elif blob_key.startswith(EXECUTION_DIGESTS_BLOB_TAG_PREFIX):
            run, begin, end = _parse_execution_digest_blob_key(blob_key)
            return json.dumps(
                self._multiplexer.ExecutionDigests(run, begin, end)
            )
        elif blob_key.startswith(EXECUTION_DATA_BLOB_TAG_PREFIX):
            run, begin, end = _parse_execution_data_blob_key(blob_key)
            return json.dumps(self._multiplexer.ExecutionData(run, begin, end))
        elif blob_key.startswith(SOURCE_FILE_LIST_BLOB_TAG):
            run = _parse_source_file_list_blob_key(blob_key)
            return json.dumps(self._multiplexer.SourceFileList(run))
        elif blob_key.startswith(SOURCE_FILE_BLOB_TAG_PREFIX):
            run, index = _parse_source_file_blob_key(blob_key)
            return json.dumps(self._multiplexer.SourceLines(run, index))
        elif blob_key.startswith(STACK_FRAMES_BLOB_TAG_PREFIX):
            run, stack_frame_ids = _parse_stack_frames_blob_key(blob_key)
            return json.dumps(
                self._multiplexer.StackFrames(run, stack_frame_ids)
            )
        else:
            raise ValueError("Unrecognized blob_key: %s" % blob_key)
