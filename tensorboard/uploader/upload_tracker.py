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
        self._num_scalars = 0
        self._num_scalars_uploaded = 0
        self._num_tensors = 0
        self._num_tensors_uploaded = 0
        self._num_blob_sequences = 0
        self._num_blob_sequences_uploaded = 0
        self._description_length = 30

    def _set_description(self, text):
        if len(text) < self._description_length:
            text += " " * self._description_length
        elif len(text) > self._description_length:
            text = text[: self._description_length]
        self._progress_bar.set_description(text)

    def _dummy_generator(self):
        while True:
            # Yield an arbitrary value 0: The progress bar is indefinite.
            yield 1

    def send_start(self):
        self._progress_bar = tqdm.tqdm(
            self._dummy_generator(), unit=" requests"
        )
        self._progress_bar.set_description("Upload starting...")
        self._progress_bar.update()

    def send_done(self):
        self._set_description("Upload done.")
        self._progress_bar.close()
        sys.stdout.write(
            "Uploaded %d scalars, %d tensors, %d blob sequences\n"
            % (
                self._num_scalars_uploaded,
                self._num_tensors_uploaded,
                self._num_blob_sequences_uploaded,
            )
        )

    def scalar_start(self):
        self._num_scalars += 1
        self._set_description("Uploading scalars")
        self._progress_bar.update()
        # print("scalar_start(): num_scalars = %s" % self._num_scalars)  # DEBUG

    def tensor_start(self):
        self._num_tensors += 1
        self._set_description("Uploading tensors")
        self._progress_bar.update()
        # print("tensor_start(): num_tensors = %s" % self._num_tensors)  # DEBUG

    def blob_sequence_start(self):
        self._num_blob_sequences += 1
        self._set_description("Uploading blobs")
        self._progress_bar.update()
        # print("blob_sequence_start(): num_blob_sequences = %s" % self._num_blob_sequences)  # DEBUG

    def scalar_done(self, is_uploaded):
        if is_uploaded:
            self._num_scalars_uploaded += 1
        self._set_description("Done uploading scalars")
        self._progress_bar.update()

    def tensor_done(self, is_uploaded):
        if is_uploaded:
            self._num_tensors_uploaded += 1
        self._set_description("Done uploading tensors")
        self._progress_bar.update()

    def blob_sequence_done(self, is_uploaded):
        if is_uploaded:
            self._num_blob_sequences_uploaded += 1
        self._set_description("Done uploading blobs")
        self._progress_bar.update()
