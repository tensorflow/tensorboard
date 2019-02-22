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
import six
from google.protobuf import text_format
import tensorflow as tf

from tensorboard.compat.proto.graph_pb2 import GraphDef
from tensorboard.plugins.graph import graph_util


class GraphUtilTest(tf.test.TestCase):
  def test_combine_graph_defs(self):
    expected_proto = '''
      node {
        name: "X"
        op: "Input"
      }
      node {
        name: "W"
        op: "Input"
      }
      node {
        name: "Y"
        op: "MatMul"
        input: "X"
        input: "W"
      }
      node {
        name: "A"
        op: "Input"
      }
      node {
        name: "B"
        op: "Input"
      }
      node {
        name: "C"
        op: "MatMul"
        input: "A"
        input: "B"
      }
      versions {
        producer: 21
      }
    '''

    graph_def_a = GraphDef()
    text_format.Merge('''
      node {
        name: "X"
        op: "Input"
      }
      node {
        name: "W"
        op: "Input"
      }
      node {
        name: "Y"
        op: "MatMul"
        input: "X"
        input: "W"
      }
      versions {
        producer: 21
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      node {
        name: "A"
        op: "Input"
      }
      node {
        name: "B"
        op: "Input"
      }
      node {
        name: "C"
        op: "MatMul"
        input: "A"
        input: "B"
      }
      versions {
        producer: 21
      }
    ''', graph_def_b)

    self.assertProtoEquals(
        expected_proto,
        graph_util.combine_graph_defs(graph_def_a, graph_def_b))

  def test_combine_graph_defs_name_collided(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      node {
        name: "X"
        op: "Input"
      }
      node {
        name: "W"
        op: "Input"
      }
      node {
        name: "Y"
        op: "MatMul"
        input: "X"
        input: "W"
      }
      versions {
        producer: 21
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      node {
        name: "X"
        op: "Input"
      }
      node {
        name: "Z"
        op: "Input"
      }
      node {
        name: "Q"
        op: "MatMul"
        input: "X"
        input: "Z"
      }
      versions {
        producer: 21
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(self, ValueError, r'node names collide: X'):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)


if __name__ == '__main__':
  tf.test.main()
