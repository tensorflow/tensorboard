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

import contextlib
from datetime import datetime
import sys

import tqdm


def readable_time_string():
    """Get a human-readable time string for the present."""
    return f"{datetime.now():%Y-%m-%dT%H:%M:%S}"


def readable_bytes_string(bytes):
    """Get a human-readable string for number of bytes."""
    if bytes >= 2 ** 20:
        return "%.1f MB" % (float(bytes) / 2 ** 20)
    elif bytes >= 2 ** 10:
        return "%.1f kB" % (float(bytes) / 2 ** 10)
    else:
        return "%d B" % bytes


class UploadStats(object):
    """Statistics of uploading."""

    def __init__(self):
        self._num_scalars = 0
        self._num_tensors = 0
        self._num_tensors_skipped = 0
        self._tensor_bytes = 0
        self._tensor_bytes_skipped = 0
        self._num_blobs = 0
        self._num_blobs_skipped = 0
        self._blob_bytes = 0
        self._blob_bytes_skipped = 0
        self._plugin_names = set()

    def add_scalars(self, num_scalars):
        """Add a batch of scalars.

        Args:
          num_scalars: Number of scalars uploaded in this batch.
        """
        self._num_scalars += num_scalars

    def add_tensors(
        self,
        num_tensors,
        num_tensors_skipped,
        tensor_bytes,
        tensor_bytes_skipped,
    ):
        """Add a batch of tensors.

        Args:
          num_tensors: Number of tensors encountered in this batch, including
            the ones skipped due to reasons such as large exceeding limit.
          num_tensors: Number of tensors skipped. This describes a subset of
            `num_tensors` and hence must be `<= num_tensors`.
          tensor_bytes: Total byte size of tensors encountered in this batch,
            including the skipped ones.
          tensor_bytes_skipped: Total byte size of the tensors skipped due to
            reasons such as size exceeding limit.
        """
        assert num_tensors_skipped <= num_tensors
        assert tensor_bytes_skipped <= tensor_bytes
        self._num_tensors += num_tensors
        self._num_tensors_skipped += num_tensors_skipped
        self._tensor_bytes += tensor_bytes
        self._tensor_bytes_skipped = tensor_bytes_skipped

    def add_blob(self, blob_bytes, is_skipped):
        """Add a blob.

        Args:
          blob_bytes: Byte size of the blob.
          is_skipped: Whether the uploading of the blob is skipped due to
            reasons such as size exceeding limit.
        """
        self._num_blobs += 1
        self._blob_bytes += blob_bytes
        if is_skipped:
            self._num_blobs_skipped += 1
            self._blob_bytes_skipped += blob_bytes

    def add_plugin(self, plugin_name):
        """Add a plugin.

        Args:
          plugin_name: Name of the plugin.
        """
        self._plugin_names.add(plugin_name)

    @property
    def num_scalars(self):
        return self._num_scalars

    @property
    def num_tensors(self):
        return self._num_tensors

    @property
    def num_tensors_skipped(self):
        return self._num_tensors_skipped

    @property
    def tensor_bytes(self):
        return self._tensor_bytes

    @property
    def tensor_bytes_skipped(self):
        return self._tensor_bytes_skipped

    @property
    def num_blobs(self):
        return self._num_blobs

    @property
    def num_blobs_skipped(self):
        return self._num_blobs_skipped

    @property
    def blob_bytes(self):
        return self._blob_bytes

    @property
    def blob_bytes_skipped(self):
        return self._blob_bytes_skipped

    @property
    def plugin_names(self):
        return self._plugin_names

    @property
    def uploaded_summary(self):
        """Get a summary string for actually-uploaded data."""
        string_pieces = []
        string_pieces.append("%d scalars" % self._num_scalars)
        uploaded_tensor_count = self._num_tensors - self._num_tensors_skipped
        uploaded_tensor_bytes = self._tensor_bytes - self._tensor_bytes_skipped
        string_pieces.append(
            "0 tensors"
            if not uploaded_tensor_count
            else (
                "%d tensors (%s)"
                % (
                    uploaded_tensor_count,
                    readable_bytes_string(uploaded_tensor_bytes),
                )
            )
        )
        uploaded_blob_count = self._num_blobs - self._num_blobs_skipped
        uploaded_blob_bytes = self._blob_bytes - self._blob_bytes_skipped
        string_pieces.append(
            "0 binary objects"
            if not uploaded_blob_count
            else (
                "%d binary objects (%s)"
                % (
                    uploaded_blob_count,
                    readable_bytes_string(uploaded_blob_bytes),
                )
            )
        )
        return ", ".join(string_pieces)

    @property
    def skipped_any(self):
        """Whether any data was skipped."""
        return self._num_tensors_skipped or self._num_blobs_skipped

    @property
    def skipped_summary(self):
        """Get a summary string for skipped data."""
        string_pieces = []
        if self._num_tensors_skipped:
            string_pieces.append(
                "%d tensors (%s)"
                % (
                    self._num_tensors_skipped,
                    readable_bytes_string(self._tensor_bytes_skipped),
                )
            )
        if self._num_blobs_skipped:
            string_pieces.append(
                "%d binary objects (%s)"
                % (
                    self._num_blobs_skipped,
                    readable_bytes_string(self._blob_bytes_skipped),
                )
            )
        return ", ".join(string_pieces)


STYLE_RESET = "\033[0m"
STYLE_BOLD = "\033[1m"
STYLE_GREEN = "\033[32m"
STYLE_YELLOW = "\033[33m"
STYLE_DARKGRAY = "\033[90m"


class UploadTracker(object):
    """Tracker for uploader progress and status."""

    def __init__(self):
        self._stats = UploadStats()
        self._dot_counter = 0
        self._cumulative_uploaded_bar = tqdm.tqdm(
            self._dummy_generator(), bar_format="{desc}", position=1
        )
        self._cumulative_skipped_bar = tqdm.tqdm(
            self._dummy_generator(), bar_format="{desc}", position=2
        )
        self._uploading_bar = tqdm.tqdm(
            self._dummy_generator(), bar_format="{desc}", position=3
        )

    def _dummy_generator(self):
        while True:
            # Yield an arbitrary value 0: The progress bar is indefinite.
            yield 0

    def _update_uploading_status(self, message, color_code=STYLE_GREEN):
        message += "." * 3
        self._uploading_bar.set_description_str(
            color_code + message + STYLE_RESET
        )
        self._uploading_bar.update()

    def _update_cumulative_status(self):
        uploaded_message = "%s[%s]%s Uploaded %s" % (
            STYLE_BOLD,
            readable_time_string(),
            STYLE_RESET,
            self._stats.uploaded_summary,
        )
        self._cumulative_uploaded_bar.set_description_str(uploaded_message)
        self._cumulative_uploaded_bar.update()
        if self._stats.skipped_any:
            skipped_message = "%s%s Skipped %s%s" % (
                STYLE_DARKGRAY,
                " " * 21,
                self._stats.skipped_summary,
                STYLE_RESET,
            )
            self._cumulative_skipped_bar.set_description_str(skipped_message)
            self._cumulative_skipped_bar.update()
        # TODO(cais): Add summary of what plugins have been involved, once it's
        # clear how to get canonical plugin names.

    def add_plugin_name(self, plugin_name):
        self._stats.add_plugin(plugin_name)

    @contextlib.contextmanager
    def send_tracker(self):
        """Create a context manager for a round of data sending."""
        self._update_uploading_status("Data upload starting")
        try:
            yield
        finally:
            self._update_uploading_status(
                "Listening for new data in logdir", color_code=STYLE_YELLOW
            )

    @contextlib.contextmanager
    def scalars_tracker(self, num_scalars):
        """Create a context manager for tracking a scalar batch upload.

        Args:
          num_scalars: Number of scalars in the batch.
        """
        self._update_uploading_status("Uploading %d scalars" % num_scalars)
        try:
            yield
        finally:
            self._stats.add_scalars(num_scalars)
            self._update_cumulative_status()

    @contextlib.contextmanager
    def tensors_tracker(
        self,
        num_tensors,
        num_tensors_skipped,
        tensor_bytes,
        tensor_bytes_skipped,
    ):
        """Create a context manager for tracking a tensor batch upload.

        Args:
          num_tensors: Total number of tensors in the batch.
          num_tensors_skipped: Number of tensors skipped (a subset of
            `num_tensors`).
          tensor_bytes: Total byte size of the tensors in the batch.
          tensor_bytes_skipped: Byte size of skipped tensors in the batch (a
            subset of `tensor_bytes`).
        """
        if num_tensors_skipped:
            message = "Uploading %d tensors (%s) (Skipping %d tensors, %s)" % (
                num_tensors - num_tensors_skipped,
                readable_bytes_string(tensor_bytes - tensor_bytes_skipped),
                num_tensors_skipped,
                readable_bytes_string(tensor_bytes_skipped),
            )
        else:
            message = "Uploading %d tensors (%s)" % (
                num_tensors,
                readable_bytes_string(tensor_bytes),
            )
        self._update_uploading_status(message)
        try:
            yield
        finally:
            self._stats.add_tensors(
                num_tensors,
                num_tensors_skipped,
                tensor_bytes,
                tensor_bytes_skipped,
            )
            self._update_cumulative_status()

    @contextlib.contextmanager
    def blob_tracker(self, blob_bytes):
        """Constructor of BlobTracker.

        Args:
          upload_stats: An instance of `UploadStats` to be used to keep track
            of uploaded blob and its byte size.
          update_status: A callable for updating status message.
          blob_bytes: Total byte size of the blob being uploaded.
        """
        self._update_uploading_status(
            "Uploading binary object (%s)" % readable_bytes_string(blob_bytes)
        )
        try:
            yield _BlobTracker(self._stats, blob_bytes)
        finally:
            self._update_cumulative_status()


class _BlobTracker(object):
    def __init__(self, upload_stats, blob_bytes):
        self._upload_stats = upload_stats
        self._blob_bytes = blob_bytes

    def mark_uploaded(self, is_uploaded):
        self._upload_stats.add_blob(
            self._blob_bytes, is_skipped=(not is_uploaded)
        )
