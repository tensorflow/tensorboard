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

import collections
import os.path

import six
from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard.backend.event_processing import plugin_event_accumulator as event_accumulator  # pylint: disable=line-too-long
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.histogram import histograms_plugin
from tensorboard.plugins.histogram import summary


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
    self.plugin = None

  def set_up_with_runs(self, run_names):
    self.logdir = self.get_temp_dir()
    for run_name in run_names:
      self.generate_run(run_name)
    multiplexer = event_multiplexer.EventMultiplexer(size_guidance={
        # don't truncate my test data, please
        event_accumulator.TENSORS: self._STEPS,
    })
    multiplexer.AddRunsFromDirectory(self.logdir)
    multiplexer.Reload()
    context = base_plugin.TBContext(logdir=self.logdir, multiplexer=multiplexer)
    self.plugin = histograms_plugin.HistogramsPlugin(context)

  def generate_run(self, run_name):
    tf.reset_default_graph()
    sess = tf.Session()
    placeholder = tf.placeholder(tf.float32, shape=[3])

    if run_name == self._RUN_WITH_LEGACY_HISTOGRAM:
      tf.summary.histogram(self._LEGACY_HISTOGRAM_TAG, placeholder)
    elif run_name == self._RUN_WITH_HISTOGRAM:
      summary.op(self._HISTOGRAM_TAG, placeholder,
                 display_name=self._DISPLAY_NAME,
                 description=self._DESCRIPTION)
    elif run_name == self._RUN_WITH_SCALARS:
      tf.summary.scalar(self._SCALAR_TAG, tf.reduce_mean(placeholder))
    else:
      assert False, 'Invalid run name: %r' % run_name
    summ = tf.summary.merge_all()

    subdir = os.path.join(self.logdir, run_name)
    writer = tf.summary.FileWriter(subdir)
    writer.add_graph(sess.graph)
    for step in xrange(self._STEPS):
      feed_dict = {placeholder: [1 + step, 2 + step, 3 + step]}
      s = sess.run(summ, feed_dict=feed_dict)
      writer.add_summary(s, global_step=step)
    writer.close()

  def test_routes_provided(self):
    """Tests that the plugin offers the correct routes."""
    self.set_up_with_runs([self._RUN_WITH_SCALARS])
    routes = self.plugin.get_plugin_apps()
    self.assertIsInstance(routes['/histograms'], collections.Callable)
    self.assertIsInstance(routes['/tags'], collections.Callable)

  def test_index(self):
    self.set_up_with_runs([self._RUN_WITH_SCALARS,
                           self._RUN_WITH_LEGACY_HISTOGRAM,
                           self._RUN_WITH_HISTOGRAM])
    self.assertEqual({
        self._RUN_WITH_SCALARS: {},
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
    }, self.plugin.index_impl())

  def _test_histograms(self, run_name, tag_name, should_work=True):
    self.set_up_with_runs([self._RUN_WITH_SCALARS,
                           self._RUN_WITH_LEGACY_HISTOGRAM,
                           self._RUN_WITH_HISTOGRAM])
    if should_work:
      self._check_histograms_result(tag_name, run_name, downsample=False)
      self._check_histograms_result(tag_name, run_name, downsample=True)
    else:
      with six.assertRaisesRegex(self, ValueError, 'No histogram tag'):
        self.plugin.histograms_impl(self._HISTOGRAM_TAG, run_name)

  def _check_histograms_result(self, tag_name, run_name, downsample):
    if downsample:
      downsample_to = 50
      expected_length = 50
    else:
      downsample_to = None
      expected_length = self._STEPS

    (data, mime_type) = self.plugin.histograms_impl(tag_name, run_name,
                                                    downsample_to=downsample_to)
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

  def test_active_with_legacy_histogram(self):
    self.set_up_with_runs([self._RUN_WITH_LEGACY_HISTOGRAM])
    self.assertTrue(self.plugin.is_active())

  def test_active_with_histogram(self):
    self.set_up_with_runs([self._RUN_WITH_HISTOGRAM])
    self.assertTrue(self.plugin.is_active())

  def test_active_with_scalars(self):
    self.set_up_with_runs([self._RUN_WITH_SCALARS])
    self.assertFalse(self.plugin.is_active())

  def test_active_with_all(self):
    self.set_up_with_runs([self._RUN_WITH_SCALARS,
                           self._RUN_WITH_LEGACY_HISTOGRAM,
                           self._RUN_WITH_HISTOGRAM])
    self.assertTrue(self.plugin.is_active())


if __name__ == '__main__':
  tf.test.main()
