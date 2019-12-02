# -*- coding: utf-8 -*-
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
"""Integration tests for the Graphs Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import collections
import math
import functools
import os.path

import tensorflow as tf

from google.protobuf import text_format
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.compat.proto import config_pb2
from tensorboard.plugins import base_plugin
from tensorboard.plugins.graph import graphs_plugin
from tensorboard.util import test_util

tf.compat.v1.disable_v2_behavior()


# TODO(stephanwlee): Move more tests into the base class when v2 test
# can write graph and metadata with a TF public API.


def with_runs():
  """Run a test with a bare multiplexer and with a `data_provider`.

  The decorated function will receive an initialized `GraphsPlugin`
  object as its first positional argument.
  """
  def decorator(fn):
    @functools.wraps(fn)
    def wrapper(self, *args, **kwargs):
      (logdir, multiplexer) = self.set_up_with_runs()
      with self.subTest('bare multiplexer'):
        ctx = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)
        fn(self, graphs_plugin.GraphsPlugin(ctx), *args, **kwargs)
      with self.subTest('generic data provider'):
        flags = argparse.Namespace(generic_data='true')
        provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
        ctx = base_plugin.TBContext(
            flags=flags,
            logdir=logdir,
            multiplexer=multiplexer,
            data_provider=provider,
        )
        fn(self, graphs_plugin.GraphsPlugin(ctx), *args, **kwargs)
    return wrapper
  return decorator


class GraphsPluginBaseTest(object):

  _RUN_WITH_GRAPH = '_RUN_WITH_GRAPH'
  _RUN_WITHOUT_GRAPH = '_RUN_WITHOUT_GRAPH'

  _METADATA_TAG = 'secret-stats'
  _MESSAGE_PREFIX_LENGTH_LOWER_BOUND = 1024

  def __init__(self, *args, **kwargs):
    super(GraphsPluginBaseTest, self).__init__(*args, **kwargs)
    self.plugin = None

  def setUp(self):
    super(GraphsPluginBaseTest, self).setUp()

  def generate_run(self, logdir, run_name, include_graph, include_run_metadata):
    """Create a run"""
    raise NotImplementedError('Please implement generate_run')

  def set_up_with_runs(self, with_graph=True, without_graph=True):
    logdir = self.get_temp_dir()
    if with_graph:
      self.generate_run(logdir,
                        self._RUN_WITH_GRAPH,
                        include_graph=True,
                        include_run_metadata=True)
    if without_graph:
      self.generate_run(logdir,
                        self._RUN_WITHOUT_GRAPH,
                        include_graph=False,
                        include_run_metadata=True)
    return self.bootstrap_plugin(logdir)

  def bootstrap_plugin(self, logdir):
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(logdir)
    multiplexer.Reload()
    return (logdir, multiplexer)

  @with_runs()
  def testRoutesProvided(self, plugin):
    """Tests that the plugin offers the correct routes."""
    # self.set_up_with_runs()
    routes = plugin.get_plugin_apps()
    self.assertIsInstance(routes['/graph'], collections.Callable)
    self.assertIsInstance(routes['/run_metadata'], collections.Callable)
    self.assertIsInstance(routes['/info'], collections.Callable)

class GraphsPluginV1Test(GraphsPluginBaseTest, tf.test.TestCase):

  def generate_run(self, logdir, run_name, include_graph, include_run_metadata):
    """Create a run with a text summary, metadata, and optionally a graph."""
    tf.compat.v1.reset_default_graph()
    k1 = tf.constant(math.pi, name='k1')
    k2 = tf.constant(math.e, name='k2')
    result = (k1 ** k2) - k1
    expected = tf.constant(20.0, name='expected')
    error = tf.abs(result - expected, name='error')
    message_prefix_value = 'error ' * 1000
    true_length = len(message_prefix_value)
    assert true_length > self._MESSAGE_PREFIX_LENGTH_LOWER_BOUND, true_length
    message_prefix = tf.constant(message_prefix_value, name='message_prefix')
    error_message = tf.strings.join([message_prefix,
                                    tf.as_string(error, name='error_string')],
                                   name='error_message')
    summary_message = tf.compat.v1.summary.text('summary_message', error_message)

    sess = tf.compat.v1.Session()
    writer = test_util.FileWriter(os.path.join(logdir, run_name))
    if include_graph:
      writer.add_graph(sess.graph)
    options = tf.compat.v1.RunOptions(trace_level=tf.compat.v1.RunOptions.FULL_TRACE)
    run_metadata = config_pb2.RunMetadata()
    s = sess.run(summary_message, options=options, run_metadata=run_metadata)
    writer.add_summary(s)
    if include_run_metadata:
      writer.add_run_metadata(run_metadata, self._METADATA_TAG)
    writer.close()

  def _get_graph(self, plugin, *args, **kwargs):
    """Set up runs, then fetch and return the graph as a proto."""
    self.set_up_with_runs()
    (graph_pbtxt, mime_type) = plugin.graph_impl(
        self._RUN_WITH_GRAPH, *args, **kwargs)
    self.assertEqual(mime_type, 'text/x-protobuf')
    return text_format.Parse(graph_pbtxt, tf.compat.v1.GraphDef())

  def test_info(self):
    expected = {
      'w_graph_w_meta': {
        'run': 'w_graph_w_meta',
        'run_graph': True,
        'tags': {
          'secret-stats': {
            'conceptual_graph': False,
            'profile': True,
            'tag': 'secret-stats',
            'op_graph': False,
          },
        },
      },
      'w_graph_wo_meta': {
        'run': 'w_graph_wo_meta',
        'run_graph': True,
        'tags': {},
      },
      'wo_graph_w_meta': {
        'run': 'wo_graph_w_meta',
        'run_graph': False,
        'tags': {
          'secret-stats': {
            'conceptual_graph': False,
            'profile': True,
            'tag': 'secret-stats',
            'op_graph': False,
          },
        },
      },
    }

    logdir = self.get_temp_dir()

    self.generate_run(logdir,
                      'w_graph_w_meta',
                      include_graph=True,
                      include_run_metadata=True)
    self.generate_run(logdir,
                      'w_graph_wo_meta',
                      include_graph=True,
                      include_run_metadata=False)
    self.generate_run(logdir,
                      'wo_graph_w_meta',
                      include_graph=False,
                      include_run_metadata=True)
    self.generate_run(logdir,
                      'wo_graph_wo_meta',
                      include_graph=False,
                      include_run_metadata=False)
    (logdir, multiplexer) = self.bootstrap_plugin(logdir)
    ctx = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)
    plugin = graphs_plugin.GraphsPlugin(ctx)

    self.assertItemsEqual(expected, plugin.info_impl())

  @with_runs()
  def test_graph_simple(self, plugin):
    graph = self._get_graph(plugin, tag=None, is_conceptual=False)
    node_names = set(node.name for node in graph.node)
    self.assertEqual({
        'k1', 'k2', 'pow', 'sub', 'expected', 'sub_1', 'error',
        'message_prefix', 'error_string', 'error_message', 'summary_message',
        'summary_message/tag', 'summary_message/serialized_summary_metadata',
    }, node_names)

  @with_runs()
  def test_graph_large_attrs(self, plugin):
    key = 'o---;;-;'
    graph = self._get_graph(
        plugin,
        tag=None,
        is_conceptual=False,
        limit_attr_size=self._MESSAGE_PREFIX_LENGTH_LOWER_BOUND,
        large_attrs_key=key)
    large_attrs = {
        node.name: list(node.attr[key].list.s)
        for node in graph.node
        if key in node.attr
    }
    self.assertEqual({'message_prefix': [b'value']},
                     large_attrs)

  @with_runs()
  def test_run_metadata(self, plugin):
    # self.set_up_with_runs()
    (metadata_pbtxt, mime_type) = plugin.run_metadata_impl(
        self._RUN_WITH_GRAPH, self._METADATA_TAG)
    self.assertEqual(mime_type, 'text/x-protobuf')
    text_format.Parse(metadata_pbtxt, config_pb2.RunMetadata())
    # If it parses, we're happy.

  @with_runs()
  def test_is_active_with_graph_without_run_metadata(self, plugin):
    logdir = self.get_temp_dir()
    self.generate_run(logdir,
                      'w_graph_wo_meta',
                      include_graph=True,
                      include_run_metadata=False)
    self.bootstrap_plugin(logdir)
    self.assertTrue(plugin.is_active())

  @with_runs()
  def test_is_active_without_graph_with_run_metadata(self, plugin):
    logdir = self.get_temp_dir()
    self.generate_run(logdir,
                      'wo_graph_w_meta',
                      include_graph=False,
                      include_run_metadata=True)
    self.bootstrap_plugin(logdir)
    self.assertTrue(plugin.is_active())

  @with_runs()
  def test_is_active_with_both(self, plugin):
    logdir = self.get_temp_dir()
    self.generate_run(logdir,
                      'w_graph_w_meta',
                      include_graph=True,
                      include_run_metadata=True)
    self.bootstrap_plugin(logdir)
    self.assertTrue(plugin.is_active())

  def test_is_active_without_both_bare_multiplexer(self):
    logdir = self.get_temp_dir()
    self.generate_run(logdir,
                      'wo_graph_wo_meta',
                      include_graph=False,
                      include_run_metadata=False)

    (logdir, multiplexer) = self.bootstrap_plugin(logdir)
    ctx = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)
    plugin = graphs_plugin.GraphsPlugin(ctx)
    self.assertFalse(plugin.is_active())

  def test_is_active_without_both_data_provider(self):
    logdir = self.get_temp_dir()
    self.generate_run(logdir,
                      'wo_graph_wo_meta',
                      include_graph=False,
                      include_run_metadata=False)

    (logdir, multiplexer) = self.bootstrap_plugin(logdir)

    flags = argparse.Namespace(generic_data='true')
    provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
    ctx = base_plugin.TBContext(
            flags=flags,
            logdir=logdir,
            multiplexer=multiplexer,
            data_provider=provider,
        )
    plugin = graphs_plugin.GraphsPlugin(ctx)
    self.assertFalse(plugin.is_active())

if __name__ == '__main__':
  tf.test.main()
