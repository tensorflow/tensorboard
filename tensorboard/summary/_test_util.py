# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""Utility methods for summary API testing."""

import glob
import os

from tensorboard.compat.proto import event_pb2
from tensorboard.compat.tensorflow_stub import errors
from tensorboard.compat.tensorflow_stub import pywrap_tensorflow


def read_tfevents_files(logdir):
    """Returns Event protos read from tfevents files in the directory.

    This does not recursively descend into subdirectories (like real
    TensorBoard); it reads only files that are at the top level.

    Args:
      logdir: string directory path to read

    Returns:
      A dict mapping filenames to lists of event_pb2.Event protos read
      from that file.
    """
    filenames = glob.glob(os.path.join(logdir, "*tfevents*"))
    results = {}
    for filename in sorted(filenames):
        events = []
        reader = pywrap_tensorflow.PyRecordReader_New(filename)
        while True:
            try:
                reader.GetNext()
            except errors.OutOfRangeError:
                break
            events.append(event_pb2.Event.FromString(reader.record()))
        results[filename] = events
    return results


def read_tfevents(logdir):
    """Returns Event protos read from a tfevents file in the directory.

    Args:
      logdir: string directory path to read

    Returns:
      A list of event_pb2.Event protos read from the file.

    Raises:
      RuntimeError: if there is not exactly one tfevents file present
          at the top level of the directory.
    """
    files_to_events = read_tfevents_files(logdir)
    if len(files_to_events) != 1:
        raise RuntimeError(
            "Expected single file but found %r" % list(files_to_events.keys())
        )
    return files_to_events.popitem()[1]
