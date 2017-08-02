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
    print(`tensor_nd_array.tolist()`)
    np.testing.assert_allclose(expected_value, tensor_nd_array)

  def test1Weight1(self):
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

      # debug
      for tensor_event in tensor_events:
        print(`tf.make_ndarray(tensor_event.tensor_proto).tolist()`)

    # Test the output for the red classifier.
    tensor_events = accumulator.Tensors('red/red')
    print(`tensor_events`)
    self.validateTensorEvent_(0, [
      [2.0, 2.0, 2.0, 1.0, 0.0],  # True positives.
      [1.0, 1.0, 1.0, 1.0, 1.0],  # False positives.
      [0.0, 0.0, 0.0, 0.0, 0.0],  # True negatives.
      [0.0, 0.0, 0.0, 1.0, 2.0],  # False negatives.
      [2/3, 2/3, 2/3, 0.5, 1.0],  # Precision.
      [1.0, 1.0, 1.0, 0.5, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent_(1, [
      [2.0, 2.0, 2.0, 1.0, 0.0],  # True positives.
      [1.0, 1.0, 1.0, 1.0, 1.0],  # False positives.
      [0.0, 0.0, 0.0, 0.0, 0.0],  # True negatives.
      [0.0, 0.0, 0.0, 1.0, 2.0],  # False negatives.
      [2/3, 2/3, 2/3, 0.5, 1.0],  # Precision.
      [1.0, 1.0, 1.0, 0.5, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent_(2, [
      [2.0, 2.0, 2.0, 1.0, 0.0],  # True positives.
      [1.0, 1.0, 1.0, 1.0, 1.0],  # False positives.
      [0.0, 0.0, 0.0, 0.0, 0.0],  # True negatives.
      [0.0, 0.0, 0.0, 1.0, 2.0],  # False negatives.
      [2/3, 2/3, 2/3, 0.5, 1.0],  # Precision.
      [1.0, 1.0, 1.0, 0.5, 0.0],  # Recall.
    ], tensor_events[2])


if __name__ == "__main__":
  tf.test.main()
