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

  def test_combine_graph_defs_name_collided_but_same_content(self):
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
        name: "X"
        op: "Input"
      }
      node {
        name: "A"
        op: "Input"
      }
      versions {
        producer: 21
      }
    ''', graph_def_b)

    self.assertProtoEquals(
        expected_proto,
        graph_util.combine_graph_defs(graph_def_a, graph_def_b))

  def test_combine_graph_defs_name_collided_different_content(self):
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
        device: "cpu:0"
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

    with six.assertRaisesRegex(
        self,
        ValueError,
        ('Cannot combine GraphDefs because nodes share a name but '
         'contents are different: X')):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_dst_nodes_duplicate_keys(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      node {
        name: "X"
        op: "Input"
      }
      node {
        name: "X"
        op: "Input"
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
      versions {
        producer: 21
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        'A GraphDef contains non-unique node names: X'):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_src_nodes_duplicate_keys(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      node {
        name: "X"
        op: "Input"
      }
      node {
        name: "Y"
        op: "Input"
      }
      versions {
        producer: 21
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      node {
        name: "W"
        op: "Input"
        device: "cpu:0"
      }
      node {
        name: "W"
        op: "Input"
      }
      versions {
        producer: 21
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        'A GraphDef contains non-unique node names: W'):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_function(self):
    expected_proto = '''
      library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
        function {
          signature {
            name: "foo_1"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
      }
    '''

    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
        function {
          signature {
            name: "foo_1"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
      }
    ''', graph_def_b)

    self.assertProtoEquals(
        expected_proto,
        graph_util.combine_graph_defs(graph_def_a, graph_def_b))

  def test_combine_graph_defs_function_collison(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "div"
            op: "Div"
            input: "x"
            input: "y"
          }
        }
        function {
          signature {
            name: "foo_1"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        ('Cannot combine GraphDefs because functions share a name but '
         'are different: foo')):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_dst_function_duplicate_keys(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
        function {
          signature {
            name: "foo"
            input_arg {
              name: "y"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "bar"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "div"
            op: "Div"
            input: "x"
            input: "y"
          }
        }
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        ('A GraphDef contains non-unique function names: foo')):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_src_function_duplicate_keys(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
          node_def {
            name: "add"
            op: "Add"
            input: "x"
            input: "y"
          }
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        function {
          signature {
            name: "bar"
            input_arg {
              name: "x"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
        }
        function {
          signature {
            name: "bar"
            input_arg {
              name: "y"
              type: DT_HALF
            }
            output_arg {
              name: "identity"
              type: DT_HALF
            }
          }
        }
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        'A GraphDef contains non-unique function names: bar'):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_gradient(self):
    expected_proto = '''
      library {
        gradient {
          function_name: "foo"
          gradient_func: "foo_grad"
        }
        gradient {
          function_name: "bar"
          gradient_func: "bar_grad"
        }
      }
    '''

    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "foo"
          gradient_func: "foo_grad"
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "foo"
          gradient_func: "foo_grad"
        }
        gradient {
          function_name: "bar"
          gradient_func: "bar_grad"
        }
      }
    ''', graph_def_b)

    self.assertProtoEquals(
        expected_proto,
        graph_util.combine_graph_defs(graph_def_a, graph_def_b))

  def test_combine_graph_defs_gradient_collison(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "foo"
          gradient_func: "foo_grad"
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "bar"
          gradient_func: "bar_grad"
        }
        gradient {
          function_name: "foo_1"
          gradient_func: "foo_grad"
        }
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        ('share a gradient_func name but map to different functions: '
         'foo_grad')):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_dst_gradient_func_non_unique(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "foo"
          gradient_func: "foo_grad"
        }
        gradient {
          function_name: "foo_bar"
          gradient_func: "foo_grad"
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "bar"
          gradient_func: "bar_grad"
        }
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        'A GraphDef contains non-unique gradient function names: foo_grad'):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)

  def test_combine_graph_defs_src_gradient_func_non_unique(self):
    graph_def_a = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "foo"
          gradient_func: "foo_grad"
        }
      }
    ''', graph_def_a)

    graph_def_b = GraphDef()
    text_format.Merge('''
      library {
        gradient {
          function_name: "bar"
          gradient_func: "bar_grad"
        }
        gradient {
          function_name: "bar_baz"
          gradient_func: "bar_grad"
        }
      }
    ''', graph_def_b)

    with six.assertRaisesRegex(
        self,
        ValueError,
        'A GraphDef contains non-unique gradient function names: bar_grad'):
      graph_util.combine_graph_defs(graph_def_a, graph_def_b)


if __name__ == '__main__':
  tf.test.main()
