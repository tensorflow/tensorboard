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
"""Tests the op that generates pr_curve summaries."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os

import numpy as np
import tensorflow as tf

from google.protobuf import json_format
from tensorboard.backend.event_processing import event_multiplexer
from tensorboard.plugins.pr_curve import summary
from tensorboard.plugins.pr_curve import pr_curve_pb2


class PrCurveTest(tf.test.TestCase):

  def setUp(self, *args, **kwargs):
    super(PrCurveTest, self).setUp(*args, **kwargs)
    self.logdir = self.get_temp_dir()
    tf.reset_default_graph()

  def test1Class(self):
    # Generate summaries for showing PR curves in TensorBoard.
    with tf.Session() as sess:
      summary.op(
          tag='tag_bar',
          labels=tf.constant([True, False, True, False], dtype=tf.bool),
          predictions=tf.constant([0.8, 0.6, 0.4, 0.2], dtype=tf.float32),
          num_thresholds=10)
      merged_summary_op = tf.summary.merge_all()
      foo_directory = os.path.join(self.logdir, 'foo')
      writer = tf.summary.FileWriter(foo_directory, sess.graph)
      writer.add_summary(sess.run(merged_summary_op), 1)
      writer.close()

    # Create a multiplexer for reading the data we just wrote.
    multiplexer = event_multiplexer.EventMultiplexer()
    multiplexer.AddRunsFromDirectory(self.logdir)
    multiplexer.Reload()

    # Verify that the metadata was correctly written.
    accumulator = multiplexer.GetAccumulator('foo')
    tag_content_dict = accumulator.PluginTagToContent('pr_curve')
    self.assertListEqual(['tag_bar/tag_bar'], list(tag_content_dict.keys()))

    # Parse the data within the JSON string and set the proto's fields.
    plugin_data = pr_curve_pb2.PrCurvePluginData()
    json_format.Parse(tag_content_dict['tag_bar/tag_bar'], plugin_data)
    self.assertEqual(10, plugin_data.num_thresholds)

    # Test the summary contents.
    tensor_events = accumulator.Tensors('tag_bar/tag_bar')
    self.assertEqual(1, len(tensor_events))
    tensor_event = tensor_events[0]
    self.assertEqual(1, tensor_event.step)

    tensor_nd_array = tf.make_ndarray(tensor_event.tensor_proto)

    # The tensor shape must be correct. The first dimension is the 4 categories
    # of counts. The 2nd dimension is the number of classes. The last dimension
    # is the number of thresholds.
    correct_shape = [6, 1, 10]
    self.assertListEqual(
        correct_shape,
        list(tensor_nd_array.shape))

    # The counts within the various bins must be correct.
    self.assertListEqual([
      [[2.0, 2.0, 2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0]],
      [[2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0]],
      [[0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0]],
      [[0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0]],
      [[0.5, 0.5, 0.6666666865348816, 0.6666666865348816, 0.5, 0.5, 1.0, 1.0, 1.0, 1.0]],
      [[1.0, 1.0, 1.0, 1.0, 0.5, 0.5, 0.5, 0.5, 0.0, 0.0]]
    ], tensor_nd_array.tolist())

if __name__ == "__main__":
  tf.test.main()
