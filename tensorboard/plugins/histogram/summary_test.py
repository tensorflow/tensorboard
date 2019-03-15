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
"""Tests for the histogram plugin summary generation functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import glob
import os

import numpy as np
import tensorflow as tf

from tensorboard.compat import tf2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.histogram import metadata
from tensorboard.plugins.histogram import summary
from tensorboard.util import tensor_util


try:
  tf2.__version__  # Force lazy import to resolve
except ImportError:
  tf2 = None

try:
  tf.compat.v1.enable_eager_execution()
except AttributeError:
  # TF 2.0 doesn't have this symbol because eager is the default.
  pass


class SummaryBaseTest(object):

  def setUp(self):
    super(SummaryBaseTest, self).setUp()
    np.random.seed(0)
    self.gaussian = np.random.normal(size=[100])

  def histogram(self, *args, **kwargs):
    raise NotImplementedError()

  def test_metadata(self):
    pb = self.histogram('h', [], description='foo')
    self.assertEqual(len(pb.value), 1)
    summary_metadata = pb.value[0].metadata
    self.assertEqual(summary_metadata.summary_description, 'foo')
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    parsed = metadata.parse_plugin_metadata(plugin_data.content)
    self.assertEqual(metadata.PROTO_VERSION, parsed.version)

  def test_empty_input(self):
    pb = self.histogram('empty', [])
    buckets = tensor_util.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([]).reshape((0, 3)))

  def test_empty_input_of_high_rank(self):
    pb = self.histogram('empty_but_fancy', [[[], []], [[], []]])
    buckets = tensor_util.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([]).reshape((0, 3)))

  def test_singleton_input(self):
    pb = self.histogram('twelve', [12])
    buckets = tensor_util.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([[11.5, 12.5, 1]]))

  def test_input_with_all_same_values(self):
    pb = self.histogram('twelven', [12, 12, 12])
    buckets = tensor_util.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([[11.5, 12.5, 3]]))

  def test_fixed_input(self):
    pass # TODO: test a small fixed input

  def test_normal_distribution_input(self):
    bucket_count = 44
    pb = self.histogram(
        'normal', data=self.gaussian.reshape((5, -1)), buckets=bucket_count)
    buckets = tensor_util.make_ndarray(pb.value[0].tensor)
    self.assertEqual(buckets[:, 0].min(), self.gaussian.min())
    # Assert near, not equal, since TF's linspace op introduces floating point
    # error in the upper bound of the result.
    self.assertNear(buckets[:, 1].max(), self.gaussian.max(), 1.0**-10)
    self.assertEqual(buckets[:, 2].sum(), self.gaussian.size)
    np.testing.assert_allclose(buckets[1:, 0], buckets[:-1, 1])

  def test_when_shape_not_statically_known(self):
    self.skipTest('TODO: figure out how to test this')
    placeholder = tf.compat.v1.placeholder(tf.float64, shape=None)
    reshaped = self.gaussian.reshape((25, -1))
    self.histogram(data=reshaped,
                                      data_tensor=placeholder,
                                      feed_dict={placeholder: reshaped})
    # The proto-equality check is all we need.

  def test_when_bucket_count_not_statically_known(self):
    self.skipTest('TODO: figure out how to test this')
    placeholder = tf.compat.v1.placeholder(tf.int32, shape=())
    bucket_count = 44
    pb = self.histogram(
        bucket_count=bucket_count,
        bucket_count_tensor=placeholder,
        feed_dict={placeholder: bucket_count})
    buckets = tensor_util.make_ndarray(pb.value[0].tensor)
    self.assertEqual(buckets.shape, (bucket_count, 3))


class SummaryV1PbTest(SummaryBaseTest, tf.test.TestCase):
  def histogram(self, *args, **kwargs):
    # Map new name to the old name.
    if 'buckets' in kwargs:
      kwargs['bucket_count'] = kwargs.pop('buckets')
    return summary.pb(*args, **kwargs)

  def test_tag(self):
    self.assertEqual('a/histogram_summary',
                     self.histogram('a', []).value[0].tag)
    self.assertEqual('a/b/histogram_summary',
                     self.histogram('a/b', []).value[0].tag)


class SummaryV1OpTest(SummaryBaseTest, tf.test.TestCase):
  def histogram(self, *args, **kwargs):
    # Map new name to the old name.
    if 'buckets' in kwargs:
      kwargs['bucket_count'] = kwargs.pop('buckets')
    return summary_pb2.Summary.FromString(summary.op(*args, **kwargs).numpy())

  def test_tag(self):
    self.assertEqual('a/histogram_summary',
                     self.histogram('a', []).value[0].tag)
    self.assertEqual('a/b/histogram_summary',
                     self.histogram('a/b', []).value[0].tag)

  def test_scoped_tag(self):
    with tf.name_scope('scope'):
      self.assertEqual('scope/a/histogram_summary',
                       self.histogram('a', []).value[0].tag)


class SummaryV2PbTest(SummaryBaseTest, tf.test.TestCase):
  def histogram(self, *args, **kwargs):
    return summary.histogram_pb(*args, **kwargs)


class SummaryV2OpTest(SummaryBaseTest, tf.test.TestCase):
  def setUp(self):
    super(SummaryV2OpTest, self).setUp()
    if tf2 is None:
      self.skipTest('v2 summary API not available')

  def histogram(self, *args, **kwargs):
    return self.histogram_event(*args, **kwargs).summary

  def histogram_event(self, *args, **kwargs):
    kwargs.setdefault('step', 1)
    writer = tf2.summary.create_file_writer(self.get_temp_dir())
    with writer.as_default():
      summary.histogram(*args, **kwargs)
    writer.close()
    event_files = sorted(glob.glob(os.path.join(self.get_temp_dir(), '*')))
    self.assertEqual(len(event_files), 1)
    events = list(tf.compat.v1.train.summary_iterator(event_files[0]))
    # Expect a boilerplate event for the file_version, then the summary one.
    self.assertEqual(len(events), 2)
    # Delete the event file to reset to an empty directory for later calls.
    # TODO(nickfelt): use a unique subdirectory per writer instead.
    os.remove(event_files[0])
    return events[1]

  def write_histogram_event(self, *args, **kwargs):
    kwargs.setdefault('step', 1)
    writer = tf2.summary.create_file_writer(self.get_temp_dir())
    with writer.as_default():
      summary.histogram(*args, **kwargs)
    writer.close()

  def test_scoped_tag(self):
    with tf.name_scope('scope'):
      self.assertEqual('scope/a', self.histogram('a', []).value[0].tag)

  def test_step(self):
    event = self.histogram_event('a', [], step=333)
    self.assertEqual(333, event.step)

  def test_default_step(self):
    try:
      tf2.summary.experimental.set_step(333)
      # TODO(nickfelt): change test logic so we can just omit `step` entirely.
      event = self.histogram_event('a', [], step=None)
      self.assertEqual(333, event.step)
    finally:
      # Reset to default state for other tests.
      tf2.summary.experimental.set_step(None)


class SummaryV2OpGraphTest(SummaryV2OpTest, tf.test.TestCase):
  def write_histogram_event(self, *args, **kwargs):
    kwargs.setdefault('step', 1)
    # Hack to extract current scope since there's no direct API for it.
    with tf.name_scope('_') as temp_scope:
      scope = temp_scope.rstrip('/_')
    @tf2.function
    def graph_fn():
      # Recreate the active scope inside the defun since it won't propagate.
      with tf.name_scope(scope):
        summary.histogram(*args, **kwargs)
    writer = tf2.summary.create_file_writer(self.get_temp_dir())
    with writer.as_default():
      graph_fn()
    writer.close()


if __name__ == '__main__':
  tf.test.main()
