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
"""Tests the debug_graphs_helper module.

[1]: Below graph creates different ops
  a = tf.Variable([1.0], name='a')
  b = tf.Variable([2.0], name='b')
  _ = tf.add(a, b, name='c')

In v1:
  a, a/Assign, a/initial_value, a/read,
  b, b/Assign, b/initial_value, b/read,
  c
In v2:
  a, a/Assign, a/Initializer/initial_value,
  a/IsInitialized/VarIsInitializedOp, a/Read/ReadVariableOp
  b, b/Assign, b/Initializer/initial_value,
  b/IsInitialized/VarIsInitializedOp, b/Read/ReadVariableOp,
  c, c/ReadVariableOp,  c/ReadVariableOp_1,
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
from tensorflow.python import debug as tf_debug

# See discussion on issue #1996 for private module import justification.
from tensorflow.python import tf2 as tensorflow_python_tf2
from tensorflow.python.debug.lib import grpc_debug_test_server

from tensorboard.compat.proto import config_pb2
from tensorboard.plugins.debugger import debug_graphs_helper
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()


class ExtractGatedGrpcDebugOpsTest(tf.test.TestCase):
    @classmethod
    def setUpClass(cls):
        (
            cls.debug_server_port,
            cls.debug_server_url,
            _,
            cls.debug_server_thread,
            cls.debug_server,
        ) = grpc_debug_test_server.start_server_on_separate_thread(
            dump_to_filesystem=False
        )
        logger.info("debug server url: %s", cls.debug_server_url)

    @classmethod
    def tearDownClass(cls):
        cls.debug_server.stop_server().wait()
        cls.debug_server_thread.join()

    def tearDown(self):
        tf.compat.v1.reset_default_graph()
        self.debug_server.clear_data()

    def _createTestGraphAndRunOptions(self, sess, gated_grpc=True):
        a = tf.Variable([1.0], name="a")
        b = tf.Variable([2.0], name="b")
        c = tf.Variable([3.0], name="c")
        d = tf.Variable([4.0], name="d")
        x = tf.add(a, b, name="x")
        y = tf.add(c, d, name="y")
        z = tf.add(x, y, name="z")

        run_options = tf.compat.v1.RunOptions(output_partition_graphs=True)
        debug_op = "DebugIdentity"
        if gated_grpc:
            debug_op += "(gated_grpc=True)"
        tf_debug.watch_graph(
            run_options,
            sess.graph,
            debug_ops=debug_op,
            debug_urls=self.debug_server_url,
        )
        return z, run_options

    def testExtractGatedGrpcTensorsFoundGatedGrpcOps(self):
        with tf.compat.v1.Session() as sess:
            z, run_options = self._createTestGraphAndRunOptions(
                sess, gated_grpc=True
            )

            sess.run(tf.compat.v1.global_variables_initializer())
            run_metadata = config_pb2.RunMetadata()
            self.assertAllClose(
                [10.0],
                sess.run(z, options=run_options, run_metadata=run_metadata),
            )

            graph_wrapper = debug_graphs_helper.DebugGraphWrapper(
                run_metadata.partition_graphs[0]
            )
            gated_debug_ops = graph_wrapper.get_gated_grpc_tensors()

            # Verify that the op types are available.
            for item in gated_debug_ops:
                self.assertTrue(item[1])

            # Strip out the op types before further checks, because op type names can
            # change in the future (e.g., 'VariableV2' --> 'VariableV3').
            gated_debug_ops = [
                (item[0], item[2], item[3]) for item in gated_debug_ops
            ]

            self.assertIn(("a", 0, "DebugIdentity"), gated_debug_ops)
            self.assertIn(("b", 0, "DebugIdentity"), gated_debug_ops)
            self.assertIn(("c", 0, "DebugIdentity"), gated_debug_ops)
            self.assertIn(("d", 0, "DebugIdentity"), gated_debug_ops)

            self.assertIn(("x", 0, "DebugIdentity"), gated_debug_ops)
            self.assertIn(("y", 0, "DebugIdentity"), gated_debug_ops)
            self.assertIn(("z", 0, "DebugIdentity"), gated_debug_ops)

    def testGraphDefProperty(self):
        with tf.compat.v1.Session() as sess:
            z, run_options = self._createTestGraphAndRunOptions(
                sess, gated_grpc=True
            )

            sess.run(tf.compat.v1.global_variables_initializer())
            run_metadata = config_pb2.RunMetadata()
            self.assertAllClose(
                [10.0],
                sess.run(z, options=run_options, run_metadata=run_metadata),
            )

            graph_wrapper = debug_graphs_helper.DebugGraphWrapper(
                run_metadata.partition_graphs[0]
            )
            self.assertProtoEquals(
                run_metadata.partition_graphs[0], graph_wrapper.graph_def
            )

    def testExtractGatedGrpcTensorsFoundNoGatedGrpcOps(self):
        with tf.compat.v1.Session() as sess:
            z, run_options = self._createTestGraphAndRunOptions(
                sess, gated_grpc=False
            )

            sess.run(tf.compat.v1.global_variables_initializer())
            run_metadata = config_pb2.RunMetadata()
            self.assertAllClose(
                [10.0],
                sess.run(z, options=run_options, run_metadata=run_metadata),
            )

            graph_wrapper = debug_graphs_helper.DebugGraphWrapper(
                run_metadata.partition_graphs[0]
            )
            gated_debug_ops = graph_wrapper.get_gated_grpc_tensors()
            self.assertEqual([], gated_debug_ops)


class BaseExpandedNodeNameTest(tf.test.TestCase):
    def testMaybeBaseExpandedNodeName(self):
        with tf.compat.v1.Session() as sess:
            a = tf.Variable([1.0], name="foo/a")
            b = tf.Variable([2.0], name="bar/b")
            _ = tf.add(a, b, name="baz/c")

            graph_wrapper = debug_graphs_helper.DebugGraphWrapper(
                sess.graph_def
            )

            self.assertEqual(
                "foo/a/(a)",
                graph_wrapper.maybe_base_expanded_node_name("foo/a"),
            )
            self.assertEqual(
                "bar/b/(b)",
                graph_wrapper.maybe_base_expanded_node_name("bar/b"),
            )
            self.assertEqual(
                "foo/a/read",
                graph_wrapper.maybe_base_expanded_node_name("foo/a/read"),
            )
            self.assertEqual(
                "bar/b/read",
                graph_wrapper.maybe_base_expanded_node_name("bar/b/read"),
            )

            if tensorflow_python_tf2.enabled():
                # NOTE(#1705): TF 2.0 tf.add creates nested nodes.
                self.assertEqual(
                    "baz/c/(c)",
                    graph_wrapper.maybe_base_expanded_node_name("baz/c"),
                )
            else:
                self.assertEqual(
                    "baz/c",
                    graph_wrapper.maybe_base_expanded_node_name("baz/c"),
                )


if __name__ == "__main__":
    tf.test.main()
