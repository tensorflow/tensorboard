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

import sys

import tqdm


class UploadTracker(object):
    def __init__(self):
        self._cumulative_num_scalars = 0
        self._cumulative_num_tensors = 0
        self._cumulative_num_blob_sequences = 0
        self._cumulative_num_blob_sequences_uploaded = 0

    def _set_description(self, text):
        self._progress_bar.set_description("%s" % text)

    def _dummy_generator(self):
        while True:
            # Yield an arbitrary value 0: The progress bar is indefinite.
            yield 0

    def send_start(self):
        self._num_scalars = 0
        self._num_tensors = 0
        self._num_blob_sequences = 0
        self._num_blob_sequences_uploaded = 0
        self._progress_bar = tqdm.tqdm(
            self._dummy_generator(), bar_format="{desc}"
        )

    def send_done(self):
        self._cumulative_num_scalars += self._num_scalars
        self._cumulative_num_tensors += self._num_tensors
        self._cumulative_num_blob_sequences += (
            self._cumulative_num_blob_sequences
        )
        self._cumulative_num_blob_sequences_uploaded += (
            self._cumulative_num_blob_sequences_uploaded
        )
        if (
            self._num_scalars
            or self._num_tensors
            or self._num_blob_sequences_uploaded
        ):
            self._progress_bar.close()
            # TODO(cais): Only populate the existing data types.
            sys.stdout.write(
                "Uploaded %d scalars, %d tensors, %d blob sequences "
                "(Cumulative: %d scalars, %d tensors, %d blob sequences)\n"
                % (
                    self._num_scalars,
                    self._num_tensors,
                    self._num_blob_sequences_uploaded,
                    self._cumulative_num_scalars,
                    self._cumulative_num_tensors,
                    self._cumulative_num_blob_sequences_uploaded,
                )
            )

    def scalars_start(self, num_scalars):
        self._num_scalars += num_scalars
        self._set_description("Uploading %d scalars" % num_scalars)
        self._progress_bar.update()

    def scalars_done(self):
        pass

    def tensor_start(self):
        self._num_tensors += 1
        self._set_description("Uploading tensors")
        self._progress_bar.update()

    def tensor_done(self, is_uploaded):
        pass

    def blob_sequence_start(self):
        self._num_blob_sequences += 1
        self._set_description("Uploading blobs")
        self._progress_bar.update()

    def blob_sequence_done(self, is_uploaded):
        if is_uploaded:
            self._num_blob_sequences_uploaded += 1
