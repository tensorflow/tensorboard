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
"""Tests for tensorboard.uploader.batching.tensor_batched_request_sender"""

import tensorflow as tf

from tensorboard.uploader.orchestration import blob_request_sender


class BlobRequestSenderTest(tf.test.TestCase):
    # TODO(bileschi): Write tests for Blob Request Sender.
    def test_add_tests_here(self):
        self.assertEqual(2, 1+1)


if __name__ == "__main__":
    tf.test.main()