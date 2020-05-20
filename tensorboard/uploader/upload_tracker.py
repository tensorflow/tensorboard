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
"""Progress tracker for uploader."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from datetime import datetime
import sys

import tqdm


def readable_time_string():
    """Get a human-readable time string for the present."""
    return f"{datetime.now():%Y-%m-%dT%H:%M:%S%z}"


def readable_bytes_string(bytes):
    """Get a human-readable string for number of bytes."""
    if bytes >= 2 ** 20:
        return "%.2f MB" % (float(bytes) / 2 ** 20)
    elif bytes >= 2 ** 10:
        return "%.2f kB" % (float(bytes) / 2 ** 10)
    else:
        return "%d B" % bytes


class UploadTracker(object):
    def __init__(self):
        self._cumulative_num_scalars = 0
        self._cumulative_num_tensors = 0
        self._cumulative_num_blobs = 0
        self._cumulative_num_blobs_uploaded = 0
        self._cumulative_blob_bytes_uploaded = 0
        self._cumulative_plugin_names = set()

    def _dummy_generator(self):
        while True:
            # Yield an arbitrary value 0: The progress bar is indefinite.
            yield 0

    def send_start(self):
        self._num_scalars = 0
        self._num_tensors = 0
        self._num_blobs = 0
        self._num_blobs_uploaded = 0
        self._blob_bytes_uploaded = 0
        self._plugin_names = set()
        self._progress_bar = None

    def _update_status(self, message):
        if not self._progress_bar:
            self._progress_bar = tqdm.tqdm(
                self._dummy_generator(), bar_format="{desc}"
            )
        self._progress_bar.set_description_str(message)
        self._progress_bar.update()

    def send_done(self):
        self._cumulative_num_scalars += self._num_scalars
        self._cumulative_num_tensors += self._num_tensors
        self._cumulative_num_blobs += self._num_blobs
        self._cumulative_num_blobs += self._num_blobs
        self._cumulative_num_blobs_uploaded += self._num_blobs_uploaded
        self._cumulative_blob_bytes_uploaded += self._blob_bytes_uploaded
        self._cumulative_plugin_names.update(self._plugin_names)
        if self._num_scalars or self._num_tensors or self._num_blobs_uploaded:
            if self._progress_bar:
                self._update_status("")
                self._progress_bar.close()
            # TODO(cais): Only populate the existing data types.
            sys.stdout.write(
                "[%s] Uploaded %d scalars, %d tensors, %d binary objects (%s) (Plugins: %s)\n"
                "    (Cumulative: %d scalars, %d tensors, %d binary objects (%s))\n"
                % (
                    readable_time_string(),
                    self._num_scalars,
                    self._num_tensors,
                    self._num_blobs_uploaded,
                    readable_bytes_string(self._blob_bytes_uploaded),
                    ", ".join(self._plugin_names),
                    self._cumulative_num_scalars,
                    self._cumulative_num_tensors,
                    self._cumulative_num_blobs_uploaded,
                    readable_bytes_string(self._cumulative_blob_bytes_uploaded),
                )
            )
            sys.stdout.flush()

    def add_plugin_name(self, plugin_name):
        self._plugin_names.add(plugin_name)

    def scalars_start(self, num_scalars):
        if not num_scalars:
            return
        self._num_scalars += num_scalars
        self._update_status("Uploading %d scalars..." % num_scalars)

    def scalars_done(self):
        pass

    def tensors_start(self, num_tensors):
        if not num_tensors:
            return
        self._num_tensors += num_tensors
        self._update_status("Uploading %d tensors..." % num_tensors)

    def tensors_done(self):
        pass

    def blob_start(self, blob_bytes):
        self._num_blobs += 1
        self._update_status(
            "Uploading binary object (%s)..."
            % readable_bytes_string(blob_bytes)
        )

    def blob_done(self, is_uploaded, blob_bytes_uploaded):
        if is_uploaded:
            self._num_blobs_uploaded += 1
            self._blob_bytes_uploaded += blob_bytes_uploaded
