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
from tensorboard.plugins.pr_curve import pr_curve_demo
from tensorboard.plugins.pr_curve import pr_curve_pb2
from tensorboard.plugins.pr_curve import summary


class PrCurveTest(tf.test.TestCase):

  def setUp(self, *args, **kwargs):
    super(PrCurveTest, self).setUp(*args, **kwargs)
    self.logdir = self.get_temp_dir()
    tf.reset_default_graph()

    # Generate data.
    pr_curve_demo.run_all(
        logdir=self.logdir,
        steps=3,
        thresholds=5,
        verbose=False)

    # Create a multiplexer for reading the data we just wrote.
    self.multiplexer = event_multiplexer.EventMultiplexer()
    self.multiplexer.AddRunsFromDirectory(self.logdir)
    self.multiplexer.Reload()

  def validateTensorEvent_(self, expected_step, expected_value, tensor_event):
    """Checks that the values stored within a tensor are correct.
    
    Args:
      expected_step: The expected step.
      tensor_event: A TensorEvent named tuple.
      expected_value: A nested python list of expected float32 values.
    """
    self.assertEqual(expected_step, tensor_event.step)
    tensor_nd_array = tf.make_ndarray(tensor_event.tensor_proto)
    np.testing.assert_allclose(
        expected_value[5][2], tensor_nd_array[5][2], rtol=0, atol=1e-7)

  def testWeight1(self):
    # Verify that the metadata was correctly written.
    accumulator = self.multiplexer.GetAccumulator('colors')
    tag_content_dict = accumulator.PluginTagToContent('pr_curve')

    # Test the summary contents.
    expected_tags = ['red/red', 'green/green', 'blue/blue']
    self.assertItemsEqual(expected_tags, list(tag_content_dict.keys()))

    for tag in expected_tags:
      # Parse the data within the JSON string and set the proto's fields.
      plugin_data = pr_curve_pb2.PrCurvePluginData()
      json_format.Parse(tag_content_dict[tag], plugin_data)
      self.assertEqual(5, plugin_data.num_thresholds)

      # Test the summary contents.
      tensor_events = accumulator.Tensors(tag)
      self.assertEqual(3, len(tensor_events))

    # Test the output for the red classifier. The red classifier has the
    # narrowest standard deviation.
    tensor_events = accumulator.Tensors('red/red')
    self.validateTensorEvent_(0, [
      [100.0, 1.0, 0.0, 0.0, 0.0],  # True positives.
      [350.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 350.0, 350.0, 350.0, 350.0],  # True negatives.
      [0.0, 99.0, 100.0, 100.0, 100.0],  # False negatives.
      [2/9, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.0099999, 0.0, 0.0, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent_(1, [
      [100.0, 0.0, 0.0, 0.0, 0.0],  # True positives.
      [350.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 350.0, 350.0, 350.0, 350.0],  # True negatives.
      [0.0, 100.0, 100.0, 100.0, 100.0],  # False negatives.
      [2/9, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.0, 0.0, 0.0, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent_(2, [
      [100.0, 0.0, 0.0, 0.0, 0.0],  # True positives.
      [350.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 350.0, 350.0, 350.0, 350.0],  # True negatives.
      [0.0, 100.0, 100.0, 100.0, 100.0],  # False negatives.
      [2/9, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.0, 0.0, 0.0, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the green classifier.
    tensor_events = accumulator.Tensors('green/green')
    self.validateTensorEvent_(0, [
      [200.0, 33.0, 7.0, 0.0, 0.0],  # True positives.
      [250.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 250.0, 250.0, 250.0, 250.0],  # True negatives.
      [0.0, 167.0, 193.0, 200.0, 200.0],  # False negatives.
      [4/9, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.1650000, 0.0350000, 0.0, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent_(1, [
      [200.0, 22.0, 6.0, 0.0, 0.0],  # True positives.
      [250.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 250.0, 250.0, 250.0, 250.0],  # True negatives.
      [0.0, 178.0, 194.0, 200.0, 200.0],  # False negatives.
      [4/9, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.1100000, 0.0299999, 0.0, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent_(2, [
      [200.0, 19.0, 5.0, 0.0, 0.0],  # True positives.
      [250.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 250.0, 250.0, 250.0, 250.0],  # True negatives.
      [0.0, 181.0, 195.0, 200.0, 200.0],  # False negatives.
      [4/9, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.0950000, 0.0249999, 0.0, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the blue classifier. The normal distribution that is
    # the blue classifier has the widest standard deviation.
    tensor_events = accumulator.Tensors('blue/blue')
    self.validateTensorEvent_(0, [
      [150.0, 139.0, 68.0, 8.0, 0.0],  # True positives.
      [300.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 300.0, 300.0, 300.0, 300.0],  # True negatives.
      [0.0, 11.0, 82.0, 142.0, 150.0],  # False negatives.
      [1/3, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.9266666, 0.4533333, 0.0533333, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent_(1, [
      [150.0, 142.0, 70.0, 7.0, 0.0],  # True positives.
      [300.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 300.0, 300.0, 300.0, 300.0],  # True negatives.
      [0.0, 8.0, 80.0, 143.0, 150.0],  # False negatives.
      [1/3, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.9466666, 0.4666666, 0.0466666, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent_(2, [
      [150.0, 134.0, 53.0, 8.0, 0.0],  # True positives.
      [300.0, 0.0, 0.0, 0.0, 0.0],  # False positives.
      [0.0, 300.0, 300.0, 300.0, 300.0],  # True negatives.
      [0.0, 16.0, 97.0, 142.0, 150.0],  # False negatives.
      [1/3, 1.0, 1.0, 1.0, 1.0],  # Precision.
      [1.0, 0.8933333, 0.3533333, 0.0533333, 0.0],  # Recall.
    ], tensor_events[2])


if __name__ == "__main__":
  tf.test.main()
