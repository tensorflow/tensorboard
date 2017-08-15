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

import numpy as np
import tensorflow as tf

from tensorboard.plugins.histogram import metadata
from tensorboard.plugins.histogram import summary


class SummaryTest(tf.test.TestCase):

  def setUp(self):
    super(SummaryTest, self).setUp()
    tf.reset_default_graph()

    np.random.seed(0)
    self.gaussian = np.random.normal(size=[500])

  def pb_via_op(self, summary_op, feed_dict=None):
    actual_pbtxt = tf.Session().run(summary_op, feed_dict=feed_dict or {})
    actual_proto = tf.Summary()
    actual_proto.ParseFromString(actual_pbtxt)
    return actual_proto

  def compute_and_check_summary_pb(self,
                                   name='nemo',
                                   data=None,
                                   bucket_count=None,
                                   display_name=None,
                                   description=None,
                                   data_tensor=None,
                                   bucket_count_tensor=None,
                                   feed_dict=None):
    """Use both `op` and `pb` to get a summary, asserting equality.

    Returns:
      a `Summary` protocol buffer
    """
    if data is None:
      data = self.gaussian
    if data_tensor is None:
      data_tensor = tf.constant(data)
    if bucket_count_tensor is None:
      bucket_count_tensor = bucket_count
    op = summary.op(name, data_tensor, bucket_count=bucket_count_tensor,
                    display_name=display_name, description=description)
    pb = summary.pb(name, data, bucket_count=bucket_count,
                    display_name=display_name, description=description)
    pb_via_op = self.pb_via_op(op, feed_dict=feed_dict)
    self.assertProtoEquals(pb, pb_via_op)
    return pb

  def test_metadata(self):
    # We're going to assume that the basic metadata is handled the same
    # across all data cases (unless explicitly changed).
    pb = self.compute_and_check_summary_pb(name='widgets')
    self.assertEqual(len(pb.value), 1)
    self.assertEqual(pb.value[0].tag, 'widgets/histogram_summary')
    summary_metadata = pb.value[0].metadata
    self.assertEqual(summary_metadata.display_name, 'widgets')
    self.assertEqual(summary_metadata.summary_description, '')
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    parsed = metadata.parse_plugin_metadata(plugin_data.content)
    self.assertEqual(metadata.PROTO_VERSION, parsed.version)

  def test_explicit_display_name_and_description(self):
    display_name = 'Widget metrics'
    description = 'Tracks widget production; *units*: MacGuffins/hr'
    pb = self.compute_and_check_summary_pb(name='widgets',
                                           display_name=display_name,
                                           description=description)
    summary_metadata = pb.value[0].metadata
    self.assertEqual(summary_metadata.display_name, display_name)
    self.assertEqual(summary_metadata.summary_description, description)
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    parsed = metadata.parse_plugin_metadata(plugin_data.content)
    self.assertEqual(metadata.PROTO_VERSION, parsed.version)

  def test_empty_input(self):
    pb = self.compute_and_check_summary_pb('nothing_to_see_here', [])
    buckets = tf.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([]).reshape((0, 3)))

  def test_empty_input_of_high_rank(self):
    pb = self.compute_and_check_summary_pb('move_along', [[[], []], [[], []]])
    buckets = tf.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([]).reshape((0, 3)))

  def test_singleton_input(self):
    pb = self.compute_and_check_summary_pb('twelve', [12])
    buckets = tf.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([[11.5, 12.5, 1]]))

  def test_input_with_all_same_values(self):
    pb = self.compute_and_check_summary_pb('twelven', [12, 12, 12])
    buckets = tf.make_ndarray(pb.value[0].tensor)
    np.testing.assert_allclose(buckets, np.array([[11.5, 12.5, 3]]))

  def test_normal_input(self):
    bucket_count = 44
    pb = self.compute_and_check_summary_pb(data=self.gaussian.reshape((5, -1)),
                                           bucket_count=bucket_count)
    buckets = tf.make_ndarray(pb.value[0].tensor)
    self.assertEqual(buckets[:, 0].min(), self.gaussian.min())
    self.assertEqual(buckets[:, 1].max(), self.gaussian.max())
    self.assertEqual(buckets[:, 2].sum(), self.gaussian.size)
    np.testing.assert_allclose(buckets[1:, 0], buckets[:-1, 1])

  def test_when_shape_not_statically_known(self):
    placeholder = tf.placeholder(tf.float64, shape=None)
    reshaped = self.gaussian.reshape((25, -1))
    self.compute_and_check_summary_pb(data=reshaped,
                                      data_tensor=placeholder,
                                      feed_dict={placeholder: reshaped})
    # The proto-equality check is all we need.

  def test_when_bucket_count_not_statically_known(self):
    placeholder = tf.placeholder(tf.int32, shape=())
    bucket_count = 44
    pb = self.compute_and_check_summary_pb(
        bucket_count=bucket_count,
        bucket_count_tensor=placeholder,
        feed_dict={placeholder: bucket_count})
    buckets = tf.make_ndarray(pb.value[0].tensor)
    self.assertEqual(buckets.shape, (bucket_count, 3))

if __name__ == '__main__':
  tf.test.main()
