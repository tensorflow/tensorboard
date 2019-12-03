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
"""Integration tests for the Histograms Plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import collections
import functools
import os.path

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard import errors
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import plugin_event_accumulator as event_accumulator  # pylint: disable=line-too-long
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.histogram import histograms_plugin
from tensorboard.plugins.histogram import summary
from tensorboard.util import test_util

tf.compat.v1.disable_v2_behavior()


class HistogramsPluginTest(tf.test.TestCase):

  _STEPS = 99

  _LEGACY_HISTOGRAM_TAG = 'my-ancient-histogram'
  _HISTOGRAM_TAG = 'my-favorite-histogram'
  _SCALAR_TAG = 'my-boring-scalars'

  _DISPLAY_NAME = 'Important production statistics'
  _DESCRIPTION = 'quod *erat* scribendum'
  _HTML_DESCRIPTION = '<p>quod <em>erat</em> scribendum</p>'

  _RUN_WITH_LEGACY_HISTOGRAM = '_RUN_WITH_LEGACY_HISTOGRAM'
  _RUN_WITH_HISTOGRAM = '_RUN_WITH_HISTOGRAM'
  _RUN_WITH_SCALARS = '_RUN_WITH_SCALARS'

  def __init__(self, *args, **kwargs):
    super(HistogramsPluginTest, self).__init__(*args, **kwargs)
    self.logdir = None

  def load_runs(self, run_names):
    logdir = self.get_temp_dir()
    for run_name in run_names:
      self.generate_run(logdir, run_name)
    multiplexer = event_multiplexer.EventMultiplexer(size_guidance={
        # don't truncate my test data, please
        event_accumulator.TENSORS: self._STEPS,
    })
    multiplexer.AddRunsFromDirectory(logdir)
    multiplexer.Reload()
    return (logdir, multiplexer)

  def with_runs(run_names):
    """Run a test with a bare multiplexer and with a `data_provider`.

    The decorated function will receive an initialized `HistogramsPlugin`
    object as its first positional argument.
    """
    def decorator(fn):
      @functools.wraps(fn)
      def wrapper(self, *args, **kwargs):
        (logdir, multiplexer) = self.load_runs(run_names)
        with self.subTest('bare multiplexer'):
          ctx = base_plugin.TBContext(logdir=logdir, multiplexer=multiplexer)
          fn(self, histograms_plugin.HistogramsPlugin(ctx), *args, **kwargs)
        with self.subTest('generic data provider'):
          flags = argparse.Namespace(generic_data='true')
          provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
          ctx = base_plugin.TBContext(
              flags=flags,
              logdir=logdir,
              multiplexer=multiplexer,
              data_provider=provider,
          )
          fn(self, histograms_plugin.HistogramsPlugin(ctx), *args, **kwargs)
      return wrapper
    return decorator

  def generate_run(self, logdir, run_name):
    tf.compat.v1.reset_default_graph()
    sess = tf.compat.v1.Session()
    placeholder = tf.compat.v1.placeholder(tf.float32, shape=[3])

    if run_name == self._RUN_WITH_LEGACY_HISTOGRAM:
      tf.compat.v1.summary.histogram(self._LEGACY_HISTOGRAM_TAG, placeholder)
    elif run_name == self._RUN_WITH_HISTOGRAM:
      summary.op(self._HISTOGRAM_TAG, placeholder,
                 display_name=self._DISPLAY_NAME,
                 description=self._DESCRIPTION)
    elif run_name == self._RUN_WITH_SCALARS:
      tf.compat.v1.summary.scalar(self._SCALAR_TAG, tf.reduce_mean(input_tensor=placeholder))
    else:
      assert False, 'Invalid run name: %r' % run_name
    summ = tf.compat.v1.summary.merge_all()

    subdir = os.path.join(logdir, run_name)
    with test_util.FileWriterCache.get(subdir) as writer:
      writer.add_graph(sess.graph)
      for step in xrange(self._STEPS):
        feed_dict = {placeholder: [1 + step, 2 + step, 3 + step]}
        s = sess.run(summ, feed_dict=feed_dict)
        writer.add_summary(s, global_step=step)

  @with_runs([_RUN_WITH_SCALARS])
  def test_routes_provided(self, plugin):
    """Tests that the plugin offers the correct routes."""
    routes = plugin.get_plugin_apps()
    self.assertIsInstance(routes['/histograms'], collections.Callable)
    self.assertIsInstance(routes['/tags'], collections.Callable)

  @with_runs([
      _RUN_WITH_SCALARS,
      _RUN_WITH_LEGACY_HISTOGRAM,
      _RUN_WITH_HISTOGRAM,
  ])
  def test_index(self, plugin):
    self.assertEqual({
        # _RUN_WITH_SCALARS omitted: No histogram data.
        self._RUN_WITH_LEGACY_HISTOGRAM: {
            self._LEGACY_HISTOGRAM_TAG: {
                'displayName': self._LEGACY_HISTOGRAM_TAG,
                'description': '',
            },
        },
        self._RUN_WITH_HISTOGRAM: {
            '%s/histogram_summary' % self._HISTOGRAM_TAG: {
                'displayName': self._DISPLAY_NAME,
                'description': self._HTML_DESCRIPTION,
            },
        },
    }, plugin.index_impl(experiment='exp'))

  @with_runs([
      _RUN_WITH_SCALARS,
      _RUN_WITH_LEGACY_HISTOGRAM,
      _RUN_WITH_HISTOGRAM,
  ])
  def _test_histograms(self, plugin, run_name, tag_name, should_work=True):
    if should_work:
      self._check_histograms_result(plugin, tag_name, run_name, downsample=False)
      self._check_histograms_result(plugin, tag_name, run_name, downsample=True)
    else:
      with self.assertRaises(errors.NotFoundError):
        plugin.histograms_impl(self._HISTOGRAM_TAG, run_name, experiment='exp')

  def _check_histograms_result(self, plugin, tag_name, run_name, downsample):
    if downsample:
      downsample_to = 50
      expected_length = 50
    else:
      downsample_to = None
      expected_length = self._STEPS

    (data, mime_type) = plugin.histograms_impl(
        tag_name, run_name, experiment='exp', downsample_to=downsample_to
    )
    self.assertEqual('application/json', mime_type)
    self.assertEqual(expected_length, len(data),
                     'expected %r, got %r (downsample=%r)'
                     % (expected_length, len(data), downsample))
    last_step_seen = None
    for (i, datum) in enumerate(data):
      [_unused_wall_time, step, buckets] = datum
      if last_step_seen is not None:
        self.assertGreater(step, last_step_seen)
      last_step_seen = step
      if not downsample:
        self.assertEqual(i, step)
      self.assertEqual(1 + step, buckets[0][0])   # first left-edge
      self.assertEqual(3 + step, buckets[-1][1])  # last right-edge
      self.assertAlmostEqual(
          3,  # three items across all buckets
          sum(bucket[2] for bucket in buckets))

  def test_histograms_with_scalars(self):
    self._test_histograms(self._RUN_WITH_SCALARS, self._HISTOGRAM_TAG,
                          should_work=False)

  def test_histograms_with_legacy_histogram(self):
    self._test_histograms(self._RUN_WITH_LEGACY_HISTOGRAM,
                          self._LEGACY_HISTOGRAM_TAG)

  def test_histograms_with_histogram(self):
    self._test_histograms(self._RUN_WITH_HISTOGRAM,
                          '%s/histogram_summary' % self._HISTOGRAM_TAG)

  @with_runs([_RUN_WITH_LEGACY_HISTOGRAM])
  def test_active_with_legacy_histogram(self, plugin):
    self.assertTrue(plugin.is_active())

  @with_runs([_RUN_WITH_HISTOGRAM])
  def test_active_with_histogram(self, plugin):
    self.assertTrue(plugin.is_active())

  @with_runs([_RUN_WITH_SCALARS])
  def test_active_with_scalars(self, plugin):
    if plugin._data_provider:
      # Hack, for now.
      self.assertTrue(plugin.is_active())
    else:
      self.assertFalse(plugin.is_active())

  @with_runs([
      _RUN_WITH_SCALARS,
      _RUN_WITH_LEGACY_HISTOGRAM,
      _RUN_WITH_HISTOGRAM,
  ])
  def test_active_with_all(self, plugin):
    self.assertTrue(plugin.is_active())


if __name__ == '__main__':
  tf.test.main()
