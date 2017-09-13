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
"""Tests for the text plugin summary generation functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import six
import tensorflow as tf

from tensorboard.plugins.text import metadata
from tensorboard.plugins.text import summary


class SummaryTest(tf.test.TestCase):

  def pb_via_op(self, summary_op, feed_dict=None):
    with tf.Session() as sess:
      actual_pbtxt = sess.run(summary_op, feed_dict=feed_dict or {})
    actual_proto = tf.Summary()
    actual_proto.ParseFromString(actual_pbtxt)
    return actual_proto

  def normalize_summary_pb(self, pb):
    """Pass `pb`'s `TensorProto` through a marshalling roundtrip.

    `TensorProto`s can be equal in value even if they are not identical
    in representation, because data can be stored in either the
    `tensor_content` field or the `${dtype}_value` field. This
    normalization ensures a canonical form, and should be used before
    comparing two `Summary`s for equality.
    """
    result = tf.Summary()
    result.MergeFrom(pb)
    for value in result.value:
      if value.HasField('tensor'):
        new_tensor = tf.make_tensor_proto(tf.make_ndarray(value.tensor))
        value.ClearField('tensor')
        value.tensor.MergeFrom(new_tensor)
    return result

  def compute_and_check_summary_pb(self, name, data,
                                   display_name=None, description=None,
                                   data_tensor=None, feed_dict=None):
    """Use both `op` and `pb` to get a summary, asserting equality.

    Returns:
      a `Summary` protocol buffer
    """
    if data_tensor is None:
      data_tensor = tf.constant(data)
    op = summary.op(
        name, data, display_name=display_name, description=description)
    pb = self.normalize_summary_pb(summary.pb(
        name, data, display_name=display_name, description=description))
    pb_via_op = self.normalize_summary_pb(
        self.pb_via_op(op, feed_dict=feed_dict))
    self.assertProtoEquals(pb, pb_via_op)
    return pb

  def test_metadata(self):
    pb = self.compute_and_check_summary_pb('do', 'A deer. A female deer.')
    summary_metadata = pb.value[0].metadata
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(summary_metadata.display_name, 'do')
    self.assertEqual(summary_metadata.summary_description, '')
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    content = summary_metadata.plugin_data.content
    # There's no content, so successfully parsing is fine.
    metadata.parse_plugin_metadata(content)

  def test_explicit_display_name_and_description(self):
    display_name = '"Re"'
    description = 'A whole step above do.'
    pb = self.compute_and_check_summary_pb('re', 'A drop of golden sun.',
                                           display_name=display_name,
                                           description=description)
    summary_metadata = pb.value[0].metadata
    self.assertEqual(summary_metadata.display_name, display_name)
    self.assertEqual(summary_metadata.summary_description, description)
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    content = summary_metadata.plugin_data.content
    # There's no content, so successfully parsing is fine.
    metadata.parse_plugin_metadata(content)

  def test_string_value(self):
    pb = self.compute_and_check_summary_pb('mi', 'A name I call myself.')
    value = tf.make_ndarray(pb.value[0].tensor).item()
    self.assertEqual(str, type(value))
    self.assertEqual('A name I call myself.', value)

  def test_np_array_value(self):
    pb = self.compute_and_check_summary_pb('fa', 'A long, long way to run.')
    value = tf.make_ndarray(pb.value[0].tensor).item()
    self.assertEqual(str, type(value))
    self.assertEqual('A long, long way to run.', value)

  def test_non_string_value_in_op(self):
    with six.assertRaisesRegex(
        self,
        Exception,
        r'Const:0 must be of type <dtype: \'string\'>'):
      with tf.Session() as sess:
        sess.run(summary.op('so', tf.constant(5)))

  def test_non_string_value_in_pb(self):
    with six.assertRaisesRegex(
        self,
        ValueError,
        r'Type \'int\d+\' is not supported. Only strings are.'):
      summary.pb('la', np.array(range(42)))

  def test_unicode_numpy_array_value_in_pb(self):
    with six.assertRaisesRegex(
        self,
        ValueError,
        r'Type \'unicode\d+\' is not supported. Only strings are.'):
      summary.pb('ti', np.array(u'A drink with jam and bread.'))


if __name__ == '__main__':
  tf.test.main()
