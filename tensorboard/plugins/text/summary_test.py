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

  def test_bytes_value(self):
    pb = self.compute_and_check_summary_pb(
        'mi', b'A name\xe2\x80\xa6I call myself')
    value = tf.make_ndarray(pb.value[0].tensor).item()
    self.assertIsInstance(value, six.binary_type)
    self.assertEqual(b'A name\xe2\x80\xa6I call myself', value)

  def test_unicode_value(self):
    pb = self.compute_and_check_summary_pb('mi', u'A name\u2026I call myself')
    value = tf.make_ndarray(pb.value[0].tensor).item()
    self.assertIsInstance(value, six.binary_type)
    self.assertEqual(b'A name\xe2\x80\xa6I call myself', value)

  def test_np_array_bytes_value(self):
    pb = self.compute_and_check_summary_pb(
        'fa',
        np.array(
            [[b'A', b'long', b'long'], [b'way', b'to', b'run \xe2\x80\xbc']]))
    values = tf.make_ndarray(pb.value[0].tensor).tolist()
    self.assertEqual(
        [[b'A', b'long', b'long'], [b'way', b'to', b'run \xe2\x80\xbc']],
        values)
    # Check that all entries are byte strings.
    for vectors in values:
      for value in vectors:
        self.assertIsInstance(value, six.binary_type)

  def test_np_array_unicode_value(self):
    pb = self.compute_and_check_summary_pb(
        'fa',
        np.array(
            [[u'A', u'long', u'long'], [u'way', u'to', u'run \u203C']]))
    values = tf.make_ndarray(pb.value[0].tensor).tolist()
    self.assertEqual(
        [[b'A', b'long', b'long'], [b'way', b'to', b'run \xe2\x80\xbc']],
        values)
    # Check that all entries are byte strings.
    for vectors in values:
      for value in vectors:
        self.assertIsInstance(value, six.binary_type)

  def test_non_string_value_in_op(self):
    with six.assertRaisesRegex(
        self,
        Exception,
        r'must be of type <dtype: \'string\'>'):
      with tf.Session() as sess:
        sess.run(summary.op('so', tf.constant(5)))

  def test_non_string_value_in_pb(self):
    with six.assertRaisesRegex(
        self,
        ValueError,
        r'Expected binary or unicode string, got 0'):
      summary.pb('la', np.array(range(42)))


if __name__ == '__main__':
  tf.test.main()
