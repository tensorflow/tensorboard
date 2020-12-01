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
from google.protobuf import text_format
import tensorflow as tf

from tensorboard.compat.proto.graph_pb2 import GraphDef
from tensorboard.plugins.graph import graph_util


class GraphUtilTest(tf.test.TestCase):
    def test_merge_graph_defs(self):
        expected_proto = """
            node {
              name: "graph_1/X"
              op: "Input"
            }
            node {
              name: "graph_1/W"
              op: "Input"
            }
            node {
              name: "graph_1/Y"
              op: "MatMul"
              input: "graph_1/X"
              input: "graph_1/W"
            }
            node {
              name: "graph_2/A"
              op: "Input"
            }
            node {
              name: "graph_2/B"
              op: "Input"
            }
            node {
              name: "graph_2/C"
              op: "MatMul"
              input: "graph_2/A"
              input: "graph_2/B"
            }
            node {
              name: "graph_3/A"
              op: "Input"
            }
            node {
              name: "graph_3/B"
              op: "Input"
            }
            versions {
              producer: 21
            }
        """

        graph_def_a = GraphDef()
        text_format.Parse(
            """
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
            """,
            graph_def_a,
        )

        graph_def_b = GraphDef()
        text_format.Parse(
            """
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
            """,
            graph_def_b,
        )

        graph_def_c = GraphDef()
        text_format.Parse(
            """
                node {
                  name: "A"
                  op: "Input"
                }
                node {
                  name: "B"
                  op: "Input"
                }
                versions {
                  producer: 21
                }
            """,
            graph_def_c,
        )

        self.assertProtoEquals(
            expected_proto,
            graph_util.merge_graph_defs(
                [graph_def_a, graph_def_b, graph_def_c]
            ),
        )

    def test_merge_graph_defs_name_collided_with_same_content(self):
        expected_proto = """
            node {
              name: "graph_1/X"
              op: "Input"
            }
            node {
              name: "graph_1/W"
              op: "Input"
            }
            node {
              name: "graph_1/Y"
              op: "MatMul"
              input: "graph_1/X"
              input: "graph_1/W"
            }
            node {
              name: "graph_2/X"
              op: "Input"
            }
            node {
              name: "graph_2/A"
              op: "Input"
            }
            node {
              name: "graph_2/Y"
              op: "MatMul"
              input: "graph_2/X"
              input: "graph_2/A"
            }
            versions {
              producer: 21
            }
        """

        graph_def_a = GraphDef()
        text_format.Parse(
            """
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
            """,
            graph_def_a,
        )

        graph_def_b = GraphDef()
        text_format.Parse(
            """
                node {
                  name: "X"
                  op: "Input"
                }
                node {
                  name: "A"
                  op: "Input"
                }
                node {
                  name: "Y"
                  op: "MatMul"
                  input: "X"
                  input: "A"
                }
                versions {
                  producer: 21
                }
            """,
            graph_def_b,
        )

        self.assertProtoEquals(
            expected_proto,
            graph_util.merge_graph_defs([graph_def_a, graph_def_b]),
        )

    def test_merge_graph_defs_function(self):
        expected_proto = """
            library {
              function {
                signature {
                  name: "graph_1_foo"
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
                  name: "graph_2_foo"
                  input_arg {
                    name: "x"
                    type: DT_INT32
                  }
                  output_arg {
                    name: "identity"
                    type: DT_INT32
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
                  name: "graph_2_foo_1"
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
        """

        graph_def_a = GraphDef()
        text_format.Parse(
            """
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
            """,
            graph_def_a,
        )

        graph_def_b = GraphDef()
        text_format.Parse(
            """
                library {
                  function {
                    signature {
                      name: "foo"
                      input_arg {
                        name: "x"
                        type: DT_INT32
                      }
                      output_arg {
                        name: "identity"
                        type: DT_INT32
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
            """,
            graph_def_b,
        )

        self.assertProtoEquals(
            expected_proto,
            graph_util.merge_graph_defs([graph_def_a, graph_def_b]),
        )

    def test_merge_graph_defs_partitioned_call_remap(self):
        expected_proto = GraphDef()
        text_format.Parse(
            """
                node {
                  name: "graph_1/X"
                  op: "PartitionedCall"
                  attr {
                    key: "f"
                    value {
                      func {
                        name: "graph_1_foo"
                      }
                    }
                  }
                }
                library {
                  function {
                    signature {
                      name: "graph_1_foo"
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
                }
            """,
            expected_proto,
        )

        graph_def_a = GraphDef()
        text_format.Parse(
            """
                node {
                  name: "X"
                  op: "PartitionedCall"
                  attr {
                    key: "f"
                    value {
                      func {
                        name: "foo"
                      }
                    }
                  }
                }
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
                  }
                }
            """,
            graph_def_a,
        )
        graph_def_b = GraphDef()

        self.assertProtoEquals(
            expected_proto,
            graph_util.merge_graph_defs([graph_def_a, graph_def_b]),
        )

    def test_merge_graph_defs_gradient(self):
        expected_proto = """
            library {
              gradient {
                function_name: "graph_1_foo"
                gradient_func: "graph_1_foo_grad"
              }
              gradient {
                function_name: "graph_2_foo"
                gradient_func: "graph_2_foo_grad"
              }
              gradient {
                function_name: "graph_2_bar"
                gradient_func: "graph_2_bar_grad"
              }
            }
        """

        graph_def_a = GraphDef()
        text_format.Parse(
            """
                library {
                  gradient {
                    function_name: "foo"
                    gradient_func: "foo_grad"
                  }
                }
            """,
            graph_def_a,
        )

        graph_def_b = GraphDef()
        text_format.Parse(
            """
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
            """,
            graph_def_b,
        )

        self.assertProtoEquals(
            expected_proto,
            graph_util.merge_graph_defs([graph_def_a, graph_def_b]),
        )

    def test_merge_graph_defs_mismatch_version(self):
        graph_def_a = GraphDef()
        text_format.Parse(
            """
              node {
                name: "A"
                op: "Input"
              }
              versions {
                producer: 21
              }
          """,
            graph_def_a,
        )

        graph_def_b = GraphDef()
        text_format.Parse(
            """
              node {
                name: "A"
                op: "Input"
              }
              versions {
                producer: 100
              }
          """,
            graph_def_b,
        )

        with self.assertRaisesRegex(
            ValueError, "Cannot combine GraphDefs of different versions"
        ):
            graph_util.merge_graph_defs([graph_def_a, graph_def_b])

    def test_merge_graph_defs_single_graph_def_no_prefix(self):
        graph_def_a = GraphDef()
        text_format.Parse(
            """
              node {
                name: "A"
                op: "Input"
              }
              versions {
                producer: 21
              }
          """,
            graph_def_a,
        )

        self.assertProtoEquals(
            graph_def_a,
            graph_util.merge_graph_defs([graph_def_a]),
        )


if __name__ == "__main__":
    tf.test.main()
