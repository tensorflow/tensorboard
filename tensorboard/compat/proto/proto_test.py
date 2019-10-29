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
"""Proto match tests between `tensorboard.compat.proto` and TensorFlow.

These tests verify that the local copy of TensorFlow protos are the same
as those available directly from TensorFlow. Local protos are used to build
`tensorboard-notf` without a TensorFlow dependency.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import difflib
import importlib

import tensorflow as tf
from google.protobuf import descriptor_pb2


# Keep this list synced with BUILD in current directory
PROTO_IMPORTS = [
  ('tensorflow.core.framework.allocation_description_pb2',
   'tensorboard.compat.proto.allocation_description_pb2'),
  ('tensorflow.core.framework.api_def_pb2',
   'tensorboard.compat.proto.api_def_pb2'),
  ('tensorflow.core.framework.attr_value_pb2',
   'tensorboard.compat.proto.attr_value_pb2'),
  ('tensorflow.core.protobuf.cluster_pb2',
   'tensorboard.compat.proto.cluster_pb2'),
  ('tensorflow.core.protobuf.config_pb2',
   'tensorboard.compat.proto.config_pb2'),
  ('tensorflow.core.framework.cost_graph_pb2',
   'tensorboard.compat.proto.cost_graph_pb2'),
  ('tensorflow.python.framework.cpp_shape_inference_pb2',
   'tensorboard.compat.proto.cpp_shape_inference_pb2'),
  ('tensorflow.core.protobuf.debug_pb2',
   'tensorboard.compat.proto.debug_pb2'),
  ('tensorflow.core.util.event_pb2',
   'tensorboard.compat.proto.event_pb2'),
  ('tensorflow.core.framework.function_pb2',
   'tensorboard.compat.proto.function_pb2'),
  ('tensorflow.core.framework.graph_pb2',
   'tensorboard.compat.proto.graph_pb2'),
  ('tensorflow.core.protobuf.meta_graph_pb2',
   'tensorboard.compat.proto.meta_graph_pb2'),
  ('tensorflow.core.framework.node_def_pb2',
   'tensorboard.compat.proto.node_def_pb2'),
  ('tensorflow.core.framework.op_def_pb2',
   'tensorboard.compat.proto.op_def_pb2'),
  ('tensorflow.core.framework.resource_handle_pb2',
   'tensorboard.compat.proto.resource_handle_pb2'),
  ('tensorflow.core.protobuf.rewriter_config_pb2',
   'tensorboard.compat.proto.rewriter_config_pb2'),
  ('tensorflow.core.protobuf.saved_object_graph_pb2',
   'tensorboard.compat.proto.saved_object_graph_pb2'),
  ('tensorflow.core.protobuf.saver_pb2',
   'tensorboard.compat.proto.saver_pb2'),
  ('tensorflow.core.framework.step_stats_pb2',
   'tensorboard.compat.proto.step_stats_pb2'),
  ('tensorflow.core.protobuf.struct_pb2',
   'tensorboard.compat.proto.struct_pb2'),
  ('tensorflow.core.framework.summary_pb2',
   'tensorboard.compat.proto.summary_pb2'),
  ('tensorflow.core.framework.tensor_pb2',
   'tensorboard.compat.proto.tensor_pb2'),
  ('tensorflow.core.framework.tensor_description_pb2',
   'tensorboard.compat.proto.tensor_description_pb2'),
  ('tensorflow.core.framework.tensor_shape_pb2',
   'tensorboard.compat.proto.tensor_shape_pb2'),
  ('tensorflow.core.profiler.tfprof_log_pb2',
   'tensorboard.compat.proto.tfprof_log_pb2'),
  ('tensorflow.core.protobuf.trackable_object_graph_pb2',
   'tensorboard.compat.proto.trackable_object_graph_pb2'),
  ('tensorflow.core.framework.types_pb2',
   'tensorboard.compat.proto.types_pb2'),
  ('tensorflow.core.framework.variable_pb2',
   'tensorboard.compat.proto.variable_pb2'),
  ('tensorflow.core.framework.versions_pb2',
   'tensorboard.compat.proto.versions_pb2'),
]

PROTO_REPLACEMENTS = [
  ('tensorflow/core/framework/', 'tensorboard/compat/proto/'),
  ('tensorflow/core/protobuf/', 'tensorboard/compat/proto/'),
  ('tensorflow/core/profiler/', 'tensorboard/compat/proto/'),
  ('tensorflow/python/framework/', 'tensorboard/compat/proto/'),
  ('tensorflow/core/util/', 'tensorboard/compat/proto/'),
  ('package: "tensorflow.tfprof"', 'package: "tensorboard"'),
  ('package: "tensorflow"', 'package: "tensorboard"'),
  ('type_name: ".tensorflow.tfprof', 'type_name: ".tensorboard'),
  ('type_name: ".tensorflow', 'type_name: ".tensorboard'),
]


class ProtoMatchTest(tf.test.TestCase):

  def test_each_proto_matches_tensorflow(self):
    for tf_path, tb_path in PROTO_IMPORTS:
        tf_pb2 = importlib.import_module(tf_path)
        tb_pb2 = importlib.import_module(tb_path)
        expected = descriptor_pb2.FileDescriptorProto()
        actual = descriptor_pb2.FileDescriptorProto()
        tf_pb2.DESCRIPTOR.CopyToProto(expected)
        tb_pb2.DESCRIPTOR.CopyToProto(actual)

        # Convert expected to be actual since this matches the
        # replacements done in proto/update.sh
        actual = str(actual)
        expected = str(expected)
        for orig, repl in PROTO_REPLACEMENTS:
          expected = expected.replace(orig, repl)

        diff = difflib.unified_diff(actual.splitlines(1),
                                    expected.splitlines(1))
        diff = ''.join(diff)

        self.assertEquals(diff, '',
            '{} and {} did not match:\n{}'.format(tf_path, tb_path, diff))


if __name__ == '__main__':
  tf.test.main()
