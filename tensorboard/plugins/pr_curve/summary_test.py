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
      [100.0, 45.0, 11.0, 2.0, 0.0],  # True positives.
      [350.0, 50.0, 11.0, 2.0, 0.0],  # False positives.
      [0.0, 300.0, 339.0, 348.0, 350.0],  # True negatives.
      [0.0, 55.0, 89.0, 98.0, 100.0],  # False negatives.
      [0.2222222, 0.4736842, 0.5, 0.5, 1.0],  # Precision.
      [1.0, 0.4499999, 0.1100000, 0.0199999, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent_(1, [
      [100.0, 41.0, 11.0, 1.0, 0.0],  # True positives.
      [350.0, 48.0, 7.0, 1.0, 0.0],  # False positives.
      [0.0, 302.0, 343.0, 349.0, 350.0],  # True negatives.
      [0.0, 59.0, 89.0, 99.0, 100.0],  # False negatives.
      [0.2222222, 0.4606741, 0.6111111, 0.5, 1.0],  # Precision.
      [1.0, 0.4100000, 0.1100000, 0.0099999, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent_(2, [
      [100.0, 39.0, 11.0, 2.0, 0.0],  # True positives.
      [350.0, 54.0, 13.0, 1.0, 0.0],  # False positives.
      [0.0, 296.0, 337.0, 349.0, 350.0],  # True negatives.
      [0.0, 61.0, 89.0, 98.0, 100.0],  # False negatives.
      [0.2222222, 0.4193548, 0.4583333, 0.6666666, 1.0],  # Precision.
      [1.0, 0.3899999, 0.1100000, 0.0199999, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the green classifier.
    tensor_events = accumulator.Tensors('green/green')
    self.validateTensorEvent_(0, [
      [200.0, 125.0, 48.0, 7.0, 0.0],  # True positives.
      [250.0, 100.0, 13.0, 2.0, 0.0],  # False positives.
      [0.0, 150.0, 237.0, 248.0, 250.0],  # True negatives.
      [0.0, 75.0, 152.0, 193.0, 200.0],  # False negatives.
      [0.4444444, 0.5555555, 0.7868852, 0.7777777, 1.0],  # Precision.
      [1.0, 0.625, 0.2400000, 0.0350000, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent_(1, [
      [200.0, 123.0, 36.0, 7.0, 0.0],  # True positives.
      [250.0, 91.0, 18.0, 2.0, 0.0],  # False positives.
      [0.0, 159.0, 232.0, 248.0, 250.0],  # True negatives.
      [0.0, 77.0, 164.0, 193.0, 200.0],  # False negatives.
      [0.4444444, 0.5747663, 0.6666666, 0.7777777, 1.0],  # Precision.
      [1.0, 0.6150000, 0.1800000, 0.0350000, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent_(2, [
      [200.0, 116.0, 40.0, 5.0, 0.0],  # True positives.
      [250.0, 87.0, 18.0, 1.0, 0.0],  # False positives.
      [0.0, 163.0, 232.0, 249.0, 250.0],  # True negatives.
      [0.0, 84.0, 160.0, 195.0, 200.0],  # False negatives.
      [0.4444444, 0.5714285, 0.6896551, 0.8333333, 1.0],  # Precision.
      [1.0, 0.5800000, 0.1999999, 0.0249999, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the blue classifier. The normal distribution that is
    # the blue classifier has the widest standard deviation.
    tensor_events = accumulator.Tensors('blue/blue')
    self.validateTensorEvent_(0, [
      [150.0, 126.0, 45.0, 6.0, 0.0],  # True positives.
      [300.0, 201.0, 38.0, 2.0, 0.0],  # False positives.
      [0.0, 99.0, 262.0, 298.0, 300.0],  # True negatives.
      [0.0, 24.0, 105.0, 144.0, 150.0],  # False negatives.
      [0.3333333, 0.3853211, 0.5421686, 0.75, 1.0],  # Precision.
      [1.0, 0.8400000, 0.3000000, 0.0400000, 0.0],  # Recall.
    ], tensor_events[0])
    self.validateTensorEvent_(1, [
      [150.0, 128.0, 45.0, 4.0, 0.0],  # True positives.
      [300.0, 204.0, 39.0, 6.0, 0.0],  # False positives.
      [0.0, 96.0, 261.0, 294.0, 300.0],  # True negatives.
      [0.0, 22.0, 105.0, 146.0, 150.0],  # False negatives.
      [0.3333333, 0.3855421, 0.5357142, 0.4000000, 1.0],  # Precision.
      [1.0, 0.8533333, 0.3000000, 0.0266666, 0.0],  # Recall.
    ], tensor_events[1])
    self.validateTensorEvent_(2, [
      [150.0, 120.0, 39.0, 4.0, 0.0],  # True positives.
      [300.0, 185.0, 38.0, 2.0, 0.0],  # False positives.
      [0.0, 115.0, 262.0, 298.0, 300.0],  # True negatives.
      [0.0, 30.0, 111.0, 146.0, 150.0],  # False negatives.
      [0.3333333, 0.3934426, 0.5064935, 0.6666666, 1.0],  # Precision.
      [1.0, 0.8000000, 0.2599999, 0.0266666, 0.0],  # Recall.
    ], tensor_events[2])

  def testWeightedRandomly(self):
    # Verify that the metadata was correctly written.
    accumulator = self.multiplexer.GetAccumulator('colors_weighted_randomly')
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
      [45.7408180, 18.8553009, 5.1260533, 1.3998152, 0.0],  # True positives.
      [174.7513885, 23.1033058, 4.1670875, 0.3778197, 0.0],  # False pos.
      [0.0, 151.6480865, 170.5843048, 174.3735656, 174.7513885],  # True neg.
      [0.0, 26.8855171, 40.6147651, 44.3410034, 45.7408180],  # False neg.
      [0.2074486, 0.4493786, 0.5515953, 0.7874593, 1.0],  # Precision.
      [1.0, 0.4122204, 0.1120673, 0.0306031, 0.0],  # Recall.
    ], tensor_events[0])

    self.validateTensorEvent_(1, [
      [51.6327362, 22.1440410, 6.2089772, 0.9456285, 0.0],  # True positives.
      [175.5727539, 24.2844123, 4.1662745, 0.6009746, 0.0],  # False positives.
      [0.0, 151.2883453, 171.4064788, 174.9717864, 175.5727539],  # True neg.
      [0.0, 29.4886951, 45.4237594, 50.6871070, 51.6327362],  # False negatives.
      [0.2272512, 0.4769498, 0.5984411, 0.6114228, 1.0],  # Precision.
      [1.0, 0.4288759, 0.1202527, 0.0183145, 0.0],  # Recall.
    ], tensor_events[1])

    self.validateTensorEvent_(2, [
      [47.9818725, 19.5967731, 6.8973226, 1.2994043, 0.0],  # True positives.
      [172.4765472, 22.6748981, 5.5888686, 0.1933380, 0.0],  # False positives.
      [0.0, 149.8016510, 166.8876800, 172.2832031, 172.4765472],  # True neg.
      [0.0, 28.3850994, 41.0845489, 46.6824684, 47.9818725],  # False negatives.
      [0.2176459, 0.4635911, 0.5523960, 0.8704813, 1.0],  # Precision.
      [1.0, 0.4084203, 0.1437485, 0.0270811, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the green classifier.
    tensor_events = accumulator.Tensors('green/green')
    self.validateTensorEvent_(0, [
      [105.3460159, 64.3658447, 23.393032, 3.8409709, 0.0],  # True positives.
      [124.8713302, 52.6495666, 7.4799661, 1.2285282, 0.0],  # False positives.
      [0.0, 72.2217636, 117.391365, 123.6427993, 124.8713302],  # True neg.
      [0.0, 40.9801712, 81.9529876, 101.505043, 105.3460159],  # False negatives.
      [0.4575937, 0.5500629, 0.7577182, 0.7576628, 1.0],  # Precision.
      [1.0, 0.6109945, 0.222059, 0.0364605, 0.0],  # Recall.
    ], tensor_events[0])
    
    self.validateTensorEvent_(1, [
      [99.5135803, 58.9167938, 18.5524463, 3.2039079, 0.0],  # True positives.
      [127.6508483, 44.6182098, 7.982316, 0.5218113, 0.0],  # False positives.
      [0.0, 83.0326385, 119.6685333, 127.1290359, 127.6508483],  # True neg.
      [0.0, 40.5967864, 80.9611358, 96.3096694, 99.5135803],  # False negatives.
      [0.4380685, 0.5690519, 0.6991751, 0.8599434, 1.0],  # Precision.
      [1.0, 0.5920478, 0.1864312, 0.0321956, 0.0],  # Recall.
    ], tensor_events[1])
    
    self.validateTensorEvent_(2, [
      [94.298767, 52.8685798, 17.872776, 2.6211104, 0.0],  # True positives.
      [131.4628601, 45.0958976, 9.2408866, 0.8802561, 0.0],  # False positives.
      [0.0, 86.3669586, 122.2219696, 130.582611, 131.4628601],  # True neg.
      [0.0, 41.4301872, 76.4259948, 91.677658, 94.298767],  # False negatives.
      [0.4176917, 0.5396709, 0.6591796, 0.7485963, 1.0],  # Precision.
      [1.0, 0.5606497, 0.1895334, 0.0277957, 0.0],  # Recall.
    ], tensor_events[2])

    # Test the output for the blue classifier. The normal distribution that is
    # the blue classifier has the widest standard deviation.
    tensor_events = accumulator.Tensors('blue/blue')
    self.validateTensorEvent_(0, [
      [79.0027465, 67.7178649, 22.9313125, 3.2087521, 0.0],  # True positives.
      [158.0326843, 106.0506973, 19.3026123, 0.9496523, 0.0],  # False pos.
      [0.0, 51.9819869, 138.730072, 157.0830383, 158.0326843],  # True neg.
      [0.0, 11.2848815, 56.071434, 75.793991, 79.0027465],  # False negatives.
      [0.3332951, 0.3897014, 0.5429595, 0.7716306, 1.0],  # Precision.
      [1.0, 0.8571583, 0.2902596, 0.0406157, 0.0],  # Recall.
    ], tensor_events[0])
<<<<<<< HEAD
    self.validateTensorEvent_(1, [
      [71.5345306, 62.7541427, 23.6120662, 1.3142696, 0.0],  # True positives.
      [153.3196563, 101.7336502, 21.2800464, 3.4279446, 0.0],  # False pos.
      [0.0, 51.5860061, 132.0396118, 149.8917083, 153.3196563],  # True neg.
      [0.0, 8.7803878, 47.9224624, 70.2202606, 71.5345306],  # False negatives.
      [0.3181374, 0.3815124, 0.5259736, 0.2771426, 1.0],  # Precision.
      [1.0, 0.8772566, 0.3300793, 0.0183725, 0.0],  # Recall.
    ], tensor_events[1])
=======

    self.validateTensorEvent_(1, [
      [71.534523, 62.7541351, 23.6120624, 1.3142696, 0.0],  # True positives.
      [153.3196716, 101.7336502, 21.2800445, 3.4279446, 0.0],  # False pos.
      [0.0, 51.5860214, 132.039627, 149.8917236, 153.3196716],  # True neg.
      [0.0, 8.7803878, 47.9224624, 70.2202529, 71.534523],  # False negatives.
      [0.3181373, 0.3815124, 0.5259736, 0.2771426, 1.0],  # Precision.
      [1.0, 0.8772566, 0.3300792, 0.0183725, 0.0],  # Recall.
    ], tensor_events[1])

>>>>>>> b1bb198fc2ec909b5a94188ef28bcc936a87926e
    self.validateTensorEvent_(2, [
      [73.0917968, 56.4307785, 17.0022487, 1.0572457, 0.0],  # True positives.
      [157.019699, 95.2676391, 18.7834777, 0.5549488, 0.0],  # False positives.
      [0.0, 61.7520599, 138.2362213, 156.4647521, 157.019699],  # True neg.
      [0.0, 16.6610183, 56.0895462, 72.0345535, 73.0917968],  # False negatives.
      [0.3176364, 0.3719931, 0.4751125, 0.6557804, 1.0],  # Precision.
      [1.0, 0.7720534, 0.232615, 0.0144646, 0.0],  # Recall.
    ], tensor_events[2])


if __name__ == "__main__":
  tf.test.main()
