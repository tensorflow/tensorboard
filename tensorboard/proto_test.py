# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Proto match tests between `tensorboard.proto` and TensorFlow.

These tests verify that the local version of TensorFlow protos are the same
as those available directly from TensorFlow. Local protos are used to build
`tensorboard-notf` without a TensorFlow dependency.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
import tensorboard.proto.graph_pb2 as tb_graph_pb2
from tensorflow.core.framework import graph_pb2 as tf_graph_pb2


class ProtoMatchTest(tf.test.TestCase):

  def test_each_proto_matches_tensorflow(self):
    actual_pb = tb_graph_pb2.DESCRIPTOR.serialized_pb
    expected_pb = tf_graph_pb2.DESCRIPTOR.serialized_pb

    # Convert actual_pb to be similar to expected_pb
    replacements = [
      ('tensorboard/proto/', 'tensorflow/core/framework/'),
      ('tensorboard', 'tensorflow'),
    ]
    for orig, repl in replacements:
      actual_pb = actual_pb.replace(orig, repl)

    self.assertProtoEquals(actual_pb, expected_pb)


if __name__ == '__main__':
  tf.test.main()
