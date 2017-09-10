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

from tensorboard.plugins.text import summary


class SummaryTest(tf.test.TestCase):

  def test_op(self):
    with tf.Session() as sess:
      pbtxt = sess.run(summary.op('foo', tf.constant('forty-two')))
      summary_pb = tf.Summary()
      summary_pb.ParseFromString(pbtxt)

    self.assertEqual(1, len(summary_pb.value))
    value = summary_pb.value[0]
    self.assertEqual('foo/text_summary', value.tag)
    self.assertEqual('foo', value.metadata.display_name)
    self.assertEqual('', value.metadata.summary_description)
    string_content = tf.make_ndarray(value.tensor).astype(np.dtype(str))
    self.assertEqual('forty-two', string_content)

  def test_op_with_custom_display_name_and_description(self):
    with tf.Session() as sess:
      op = summary.op(
          name='foo',
          data=tf.constant('forty-two'),
          display_name='42',
          description='It succeeds 41 and precedes 43.')
      pbtxt = sess.run(op)
      summary_pb = tf.Summary()
      summary_pb.ParseFromString(pbtxt)

    self.assertEqual(1, len(summary_pb.value))
    value = summary_pb.value[0]
    self.assertEqual('42', value.metadata.display_name)
    self.assertEqual(
        'It succeeds 41 and precedes 43.', value.metadata.summary_description)

  def test_pb_with_python_string(self):
    summary_pb = summary.pb('foo', 'forty-two')
    self.assertEqual(1, len(summary_pb.value))
    value = summary_pb.value[0]
    self.assertEqual('foo/text_summary', value.tag)
    self.assertEqual('foo', value.metadata.display_name)
    self.assertEqual('', value.metadata.summary_description)
    string_content = tf.make_ndarray(value.tensor).astype(np.dtype(str))
    self.assertEqual('forty-two', string_content)

  def test_pb_with_numpy_array(self):
    summary_pb = summary.pb('foo', np.array('forty-two'))
    self.assertEqual(1, len(summary_pb.value))
    value = summary_pb.value[0]
    self.assertEqual('foo/text_summary', value.tag)
    self.assertEqual('foo', value.metadata.display_name)
    self.assertEqual('', value.metadata.summary_description)
    string_content = tf.make_ndarray(value.tensor).astype(np.dtype(str))
    self.assertEqual('forty-two', string_content)

  def test_pb_with_custom_display_name_and_description(self):
    summary_pb = summary.pb(
        name='foo',
        data='forty-two',
        display_name='42',
        description='It succeeds 41 and precedes 43.')
    self.assertEqual(1, len(summary_pb.value))
    value = summary_pb.value[0]
    self.assertEqual('42', value.metadata.display_name)
    self.assertEqual(
        'It succeeds 41 and precedes 43.', value.metadata.summary_description)


if __name__ == '__main__':
  tf.test.main()
