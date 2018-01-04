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
"""Tests the debug_graphs_helper module."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf
from tensorflow.python import debug as tf_debug
from tensorflow.python.debug.lib import grpc_debug_test_server

from tensorboard.plugins.debugger import debug_graphs_helper


class ExtractGatedGrpcDebugOpsTest(tf.test.TestCase):

  @classmethod
  def setUpClass(cls):
    (cls.debug_server_port, cls.debug_server_url, _, cls.debug_server_thread,
     cls.debug_server
    ) = grpc_debug_test_server.start_server_on_separate_thread(
        dump_to_filesystem=False)
    tf.logging.info('debug server url: %s', cls.debug_server_url)

  @classmethod
  def tearDownClass(cls):
    cls.debug_server.stop_server().wait()
    cls.debug_server_thread.join()

  def tearDown(self):
    tf.reset_default_graph()
    self.debug_server.clear_data()

  def _createTestGraphAndRunOptions(self, sess, gated_grpc=True):
    a = tf.Variable([1.0], name='a')
    b = tf.Variable([2.0], name='b')
    c = tf.Variable([3.0], name='c')
    d = tf.Variable([4.0], name='d')
    x = tf.add(a, b, name='x')
    y = tf.add(c, d, name='y')
    z = tf.add(x, y, name='z')

    run_options = tf.RunOptions(output_partition_graphs=True)
    debug_op = 'DebugIdentity'
    if gated_grpc:
      debug_op += '(gated_grpc=True)'
    tf_debug.watch_graph(run_options,
                         sess.graph,
                         debug_ops=debug_op,
                         debug_urls=self.debug_server_url)
    return z, run_options

  def testExtractGatedGrpcTensorsFoundGatedGrpcOps(self):
    with tf.Session() as sess:
      z, run_options = self._createTestGraphAndRunOptions(sess, gated_grpc=True)

      sess.run(tf.global_variables_initializer())
      run_metadata = tf.RunMetadata()
      self.assertAllClose(
          [10.0], sess.run(z, options=run_options, run_metadata=run_metadata))

      graph_wrapper = debug_graphs_helper.DebugGraphWrapper(
          run_metadata.partition_graphs[0])
      gated_debug_ops = graph_wrapper.get_gated_grpc_tensors()

      # Verify that the op types are available.
      for item in gated_debug_ops:
        self.assertTrue(item[1])

      # Strip out the op types before further checks, because op type names can
      # change in the future (e.g., 'VariableV2' --> 'VariableV3').
      gated_debug_ops = [
          (item[0], item[2], item[3]) for item in gated_debug_ops]

      self.assertIn(('a', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('a/read', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('b', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('b/read', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('c', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('c/read', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('d', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('d/read', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('x', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('y', 0, 'DebugIdentity'), gated_debug_ops)
      self.assertIn(('z', 0, 'DebugIdentity'), gated_debug_ops)

  def testGraphDefProperty(self):
    with tf.Session() as sess:
      z, run_options = self._createTestGraphAndRunOptions(sess, gated_grpc=True)

      sess.run(tf.global_variables_initializer())
      run_metadata = tf.RunMetadata()
      self.assertAllClose(
          [10.0], sess.run(z, options=run_options, run_metadata=run_metadata))

      graph_wrapper = debug_graphs_helper.DebugGraphWrapper(
          run_metadata.partition_graphs[0])
      self.assertProtoEquals(
          run_metadata.partition_graphs[0], graph_wrapper.graph_def)

  def testExtractGatedGrpcTensorsFoundNoGatedGrpcOps(self):
    with tf.Session() as sess:
      z, run_options = self._createTestGraphAndRunOptions(sess,
                                                          gated_grpc=False)

      sess.run(tf.global_variables_initializer())
      run_metadata = tf.RunMetadata()
      self.assertAllClose(
          [10.0], sess.run(z, options=run_options, run_metadata=run_metadata))

      graph_wrapper = debug_graphs_helper.DebugGraphWrapper(
          run_metadata.partition_graphs[0])
      gated_debug_ops = graph_wrapper.get_gated_grpc_tensors()
      self.assertEqual([], gated_debug_ops)


class BaseExpandedNodeNameTest(tf.test.TestCase):

  def testMaybeBaseExpandedNodeName(self):
    with tf.Session() as sess:
      a = tf.Variable([1.0], name='foo/a')
      b = tf.Variable([2.0], name='bar/b')
      _ = tf.add(a, b, name='baz/c')

      graph_wrapper = debug_graphs_helper.DebugGraphWrapper(sess.graph_def)

      self.assertEqual(
          'foo/a/(a)', graph_wrapper.maybe_base_expanded_node_name('foo/a'))
      self.assertEqual(
          'bar/b/(b)', graph_wrapper.maybe_base_expanded_node_name('bar/b'))
      self.assertEqual(
          'foo/a/read',
          graph_wrapper.maybe_base_expanded_node_name('foo/a/read'))
      self.assertEqual(
          'bar/b/read',
          graph_wrapper.maybe_base_expanded_node_name('bar/b/read'))
      self.assertEqual(
          'baz/c', graph_wrapper.maybe_base_expanded_node_name('baz/c'))


if __name__ == '__main__':
  tf.test.main()
