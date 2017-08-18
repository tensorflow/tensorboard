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
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer
from tensorboard.plugins.pr_curve import plugin_data_pb2
from tensorboard.plugins.pr_curve import pr_curve_demo
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

  def validateTensorEvent(self, expected_step, expected_value, tensor_event):
    """Checks that the values stored within a tensor are correct.

    Args:
      expected_step: The expected step.
      tensor_event: A TensorEvent named tuple.
      expected_value: A nested python list of expected float32 values.
    """
    self.assertEqual(expected_step, tensor_event.step)
    tensor_nd_array = tf.make_ndarray(tensor_event.tensor_proto)
    # We use an absolute error instead of a relative one because the expected
    # values are small. The default relative error (trol) of 1e-7 yields many
    # undesired test failures.
    np.testing.assert_allclose(
        expected_value, tensor_nd_array, rtol=0, atol=1e-7)

  def testWeight1(self):
    # Verify that the metadata was correctly written.
    accumulator = self.multiplexer.GetAccumulator('colors')
    tag_content_dict = accumulator.PluginTagToContent('pr_curves')

    # Test the summary contents.
    expected_tags = ['red/pr_curves', 'green/pr_curves', 'blue/pr_curves']
    self.assertItemsEqual(expected_tags, list(tag_content_dict.keys()))

    for tag in expected_tags:
      # Parse the data within the JSON string and set the proto's fields.
      plugin_data = plugin_data_pb2.PrCurvePluginData()
      json_format.Parse(tag_content_dict[tag], plugin_data)
      self.assertEqual(5, plugin_data.num_thresholds)

      # Test the summary contents.
      tensor_events = accumulator.Tensors(tag)
      self.assertEqual(3, len(tensor_events))

    # Test the output for the red classifier. The red classifier has the
    # narrowest standard deviation.
    tensor_events = accumulator.Tensors('red/pr_curves')
    self.validateTensorEvent(0, [
      [100.0, 45.0, 11.0, 2.0, 0.0],  # True positives.
      [350.0, 50.0, 11.0, 2.0, 0.0],  # False positives.
      [0.0, 300.0, 339.0, 348.0, 350.0],  # True negatives.
      [0.0, 55.0, 89.0, 98.0, 100.0],  # False negatives.
      [0.2222222, 0.4736842, 0.5, 0.5, 1.0],  # Precision.
      [1.0, 0.4499999, 0.1100000, 0.0199999, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent(1, [
      [100.0, 41.0, 11.0, 1.0, 0.0],  # True positives.
      [350.0, 48.0, 7.0, 1.0, 0.0],  # False positives.
      [0.0, 302.0, 343.0, 349.0, 350.0],  # True negatives.
      [0.0, 59.0, 89.0, 99.0, 100.0],  # False negatives.
      [0.2222222, 0.4606741, 0.6111111, 0.5, 1.0],  # Precision.
      [1.0, 0.4100000, 0.1100000, 0.0099999, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent(2, [
      [100.0, 39.0, 11.0, 2.0, 0.0],  # True positives.
      [350.0, 54.0, 13.0, 1.0, 0.0],  # False positives.
      [0.0, 296.0, 337.0, 349.0, 350.0],  # True negatives.
      [0.0, 61.0, 89.0, 98.0, 100.0],  # False negatives.
      [0.2222222, 0.4193548, 0.4583333, 0.6666666, 1.0],  # Precision.
      [1.0, 0.3899999, 0.1100000, 0.0199999, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the green classifier.
    tensor_events = accumulator.Tensors('green/pr_curves')
    self.validateTensorEvent(0, [
      [200.0, 125.0, 48.0, 7.0, 0.0],  # True positives.
      [250.0, 100.0, 13.0, 2.0, 0.0],  # False positives.
      [0.0, 150.0, 237.0, 248.0, 250.0],  # True negatives.
      [0.0, 75.0, 152.0, 193.0, 200.0],  # False negatives.
      [0.4444444, 0.5555555, 0.7868852, 0.7777777, 1.0],  # Precision.
      [1.0, 0.625, 0.2400000, 0.0350000, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent(1, [
      [200.0, 123.0, 36.0, 7.0, 0.0],  # True positives.
      [250.0, 91.0, 18.0, 2.0, 0.0],  # False positives.
      [0.0, 159.0, 232.0, 248.0, 250.0],  # True negatives.
      [0.0, 77.0, 164.0, 193.0, 200.0],  # False negatives.
      [0.4444444, 0.5747663, 0.6666666, 0.7777777, 1.0],  # Precision.
      [1.0, 0.6150000, 0.1800000, 0.0350000, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent(2, [
      [200.0, 116.0, 40.0, 5.0, 0.0],  # True positives.
      [250.0, 87.0, 18.0, 1.0, 0.0],  # False positives.
      [0.0, 163.0, 232.0, 249.0, 250.0],  # True negatives.
      [0.0, 84.0, 160.0, 195.0, 200.0],  # False negatives.
      [0.4444444, 0.5714285, 0.6896551, 0.8333333, 1.0],  # Precision.
      [1.0, 0.5800000, 0.1999999, 0.0249999, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the blue classifier. The normal distribution that is
    # the blue classifier has the widest standard deviation.
    tensor_events = accumulator.Tensors('blue/pr_curves')
    self.validateTensorEvent(0, [
      [150.0, 126.0, 45.0, 6.0, 0.0],  # True positives.
      [300.0, 201.0, 38.0, 2.0, 0.0],  # False positives.
      [0.0, 99.0, 262.0, 298.0, 300.0],  # True negatives.
      [0.0, 24.0, 105.0, 144.0, 150.0],  # False negatives.
      [0.3333333, 0.3853211, 0.5421686, 0.75, 1.0],  # Precision.
      [1.0, 0.8400000, 0.3000000, 0.0400000, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent(1, [
      [150.0, 128.0, 45.0, 4.0, 0.0],  # True positives.
      [300.0, 204.0, 39.0, 6.0, 0.0],  # False positives.
      [0.0, 96.0, 261.0, 294.0, 300.0],  # True negatives.
      [0.0, 22.0, 105.0, 146.0, 150.0],  # False negatives.
      [0.3333333, 0.3855421, 0.5357142, 0.4000000, 1.0],  # Precision.
      [1.0, 0.8533333, 0.3000000, 0.0266666, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent(2, [
      [150.0, 120.0, 39.0, 4.0, 0.0],  # True positives.
      [300.0, 185.0, 38.0, 2.0, 0.0],  # False positives.
      [0.0, 115.0, 262.0, 298.0, 300.0],  # True negatives.
      [0.0, 30.0, 111.0, 146.0, 150.0],  # False negatives.
      [0.3333333, 0.3934426, 0.5064935, 0.6666666, 1.0],  # Precision.
      [1.0, 0.8000000, 0.2599999, 0.0266666, 0.0],  # Recall.
    ], tensor_events[2])

  def testExplicitWeights(self):
    # Verify that the metadata was correctly written.
    accumulator = self.multiplexer.GetAccumulator('mask_every_other_prediction')
    tag_content_dict = accumulator.PluginTagToContent('pr_curves')

    # Test the summary contents.
    expected_tags = ['red/pr_curves', 'green/pr_curves', 'blue/pr_curves']
    self.assertItemsEqual(expected_tags, list(tag_content_dict.keys()))

    for tag in expected_tags:
      # Parse the data within the JSON string and set the proto's fields.
      plugin_data = plugin_data_pb2.PrCurvePluginData()
      json_format.Parse(tag_content_dict[tag], plugin_data)
      self.assertEqual(5, plugin_data.num_thresholds)

      # Test the summary contents.
      tensor_events = accumulator.Tensors(tag)
      self.assertEqual(3, len(tensor_events))

    # Test the output for the red classifier. The red classifier has the
    # narrowest standard deviation.
    tensor_events = accumulator.Tensors('red/pr_curves')
    self.validateTensorEvent(0, [
      [50.0, 22.0, 4.0, 0.0, 0.0],  # True positives.
      [175.0, 22.0, 6.0, 1.0, 0.0],  # False positives.
      [0.0, 153.0, 169.0, 174.0, 175.0],  # True negatives.
      [0.0, 28.0, 46.0, 50.0, 50.0],  # False negatives.
      [0.2222222, 0.5, 0.4, 1e-07, 1.0],  # Precision.
      [1.0, 0.44, 0.08, 0.0, 0.0],  # Recall.
    ], tensor_events[0])

    self.validateTensorEvent(1, [
      [50.0, 17.0, 5.0, 1.0, 0.0],  # True positives.
      [175.0, 28.0, 1.0, 0.0, 0.0],  # False positives.
      [0.0, 147.0, 174.0, 175.0, 175.0],  # True negatives.
      [0.0, 33.0, 45.0, 49.0, 50.0],  # False negatives.
      [0.2222222, 0.3777778, 0.8333333, 1.0, 1.0],  # Precision.
      [1.0, 0.34, 0.1, 0.02, 0.0],  # Recall.
    ], tensor_events[1])

    self.validateTensorEvent(2, [
      [50.0, 18.0, 6.0, 1.0, 0.0],  # True positives.
      [175.0, 27.0, 6.0, 0.0, 0.0],  # False positives.
      [0.0, 148.0, 169.0, 175.0, 175.0],  # True negatives.
      [0.0, 32.0, 44.0, 49.0, 50.0],  # False negatives.
      [0.2222222, 0.4, 0.5, 1.0, 1.0],  # Precision.
      [1.0, 0.36, 0.12, 0.02, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the green classifier.
    tensor_events = accumulator.Tensors('green/pr_curves')

    self.validateTensorEvent(0, [
      [100.0, 71.0, 24.0, 2.0, 0.0],  # True positives.
      [125.0, 51.0, 5.0, 2.0, 0.0],  # False positives.
      [0.0, 74.0, 120.0, 123.0, 125.0],  # True negatives.
      [0.0, 29.0, 76.0, 98.0, 100.0],  # False negatives.
      [0.4444444, 0.5819672, 0.8275862, 0.5, 1.0],  # Precision.
      [1.0, 0.71, 0.24, 0.02, 0.0],  # Recall.
    ], tensor_events[0])

    self.validateTensorEvent(1, [
      [100.0, 63.0, 20.0, 5.0, 0.0],  # True positives.
      [125.0, 42.0, 7.0, 1.0, 0.0],  # False positives.
      [0.0, 83.0, 118.0, 124.0, 125.0],  # True negatives.
      [0.0, 37.0, 80.0, 95.0, 100.0],  # False negatives.
      [0.4444444, 0.6, 0.7407407, 0.8333333, 1.0],  # Precision.
      [1.0, 0.63, 0.2, 0.05, 0.0],  # Recall.
    ], tensor_events[1])

    self.validateTensorEvent(2, [
      [100.0, 58.0, 19.0, 2.0, 0.0],  # True positives.
      [125.0, 40.0, 7.0, 0.0, 0.0],  # False positives.
      [0.0, 85.0, 118.0, 125.0, 125.0],  # True negatives.
      [0.0, 42.0, 81.0, 98.0, 100.0],  # False negatives.
      [0.4444444, 0.5918368, 0.7307692, 1.0, 1.0],  # Precision.
      [1.0, 0.58, 0.19, 0.02, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the blue classifier. The normal distribution that is
    # the blue classifier has the widest standard deviation.
    tensor_events = accumulator.Tensors('blue/pr_curves')

    self.validateTensorEvent(0, [
      [75.0, 64.0, 21.0, 5.0, 0.0],  # True positives.
      [150.0, 105.0, 18.0, 0.0, 0.0],  # False positives.
      [0.0, 45.0, 132.0, 150.0, 150.0],  # True negatives.
      [0.0, 11.0, 54.0, 70.0, 75.0],  # False negatives.
      [0.3333333, 0.3786982, 0.5384616, 1.0, 1.0],  # Precision.
      [1.0, 0.8533334, 0.28, 0.0666667, 0.0],  # Recall.
    ], tensor_events[0])

    self.validateTensorEvent(1, [
      [75.0, 62.0, 21.0, 1.0, 0.0],  # True positives.
      [150.0, 99.0, 21.0, 3.0, 0.0],  # False positives.
      [0.0, 51.0, 129.0, 147.0, 150.0],  # True negatives.
      [0.0, 13.0, 54.0, 74.0, 75.0],  # False negatives.
      [0.3333333, 0.3850932, 0.5, 0.25, 1.0],  # Precision.
      [1.0, 0.8266667, 0.28, 0.0133333, 0.0],  # Recall.
    ], tensor_events[1])

    self.validateTensorEvent(2, [
      [75.0, 61.0, 16.0, 2.0, 0.0],  # True positives.
      [150.0, 92.0, 20.0, 1.0, 0.0],  # False positives.
      [0.0, 58.0, 130.0, 149.0, 150.0],  # True negatives.
      [0.0, 14.0, 59.0, 73.0, 75.0],  # False negatives.
      [0.3333333, 0.3986928, 0.4444444, 0.6666667, 1.0],  # Precision.
      [1.0, 0.8133333, 0.2133333, 0.0266666, 0.0],  # Recall.
    ], tensor_events[2])


if __name__ == "__main__":
  tf.test.main()
