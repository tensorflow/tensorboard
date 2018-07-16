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
"""Tests for the image plugin summary generation functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import six
import tensorflow as tf

from tensorboard.plugins.image import metadata
from tensorboard.plugins.image import summary


class SummaryTest(tf.test.TestCase):

  def setUp(self):
    super(SummaryTest, self).setUp()
    tf.reset_default_graph()

    self.image_width = 300
    self.image_height = 75
    self.image_count = 8
    np.random.seed(0)
    self.images = self._generate_images(channels=3)
    self.images_with_alpha = self._generate_images(channels=4)

  def _generate_images(self, channels):
    size = [self.image_count, self.image_height, self.image_width, channels]
    return np.random.uniform(low=0, high=255, size=size).astype(np.uint8)

  def pb_via_op(self, summary_op, feed_dict=None):
    with tf.Session() as sess:
      actual_pbtxt = sess.run(summary_op, feed_dict=feed_dict or {})
    actual_proto = tf.Summary()
    actual_proto.ParseFromString(actual_pbtxt)
    return actual_proto


  def compute_and_check_summary_pb(self, name, images, max_outputs=3,
                                   images_tensor=None, feed_dict=None):
    """Use both `op` and `pb` to get a summary, asserting equality.

    Returns:
      a `Summary` protocol buffer
    """
    if images_tensor is None:
      images_tensor = tf.cast(tf.constant(images), tf.uint8)
    op = summary.op(name, images_tensor, max_outputs=max_outputs)
    pb = summary.pb(name, images, max_outputs=max_outputs)
    pb_via_op = self.pb_via_op(op, feed_dict=feed_dict)
    self.assertProtoEquals(pb, pb_via_op)
    return pb

  def test_metadata(self):
    pb = self.compute_and_check_summary_pb('mona_lisa', self.images)
    summary_metadata = pb.value[0].metadata
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    content = summary_metadata.plugin_data.content
    # There's no content, so successfully parsing is fine.
    metadata.parse_plugin_metadata(content)

  def test_correctly_handles_no_images(self):
    shape = (0, self.image_height, self.image_width, 3)
    images = np.array([]).reshape(shape)
    pb = self.compute_and_check_summary_pb('mona_lisa', images, max_outputs=3)
    self.assertEqual(1, len(pb.value))
    result = pb.value[0].tensor.string_val
    self.assertEqual(tf.compat.as_bytes(str(self.image_width)), result[0])
    self.assertEqual(tf.compat.as_bytes(str(self.image_height)), result[1])
    image_results = result[2:]
    self.assertEqual(len(image_results), 0)

  def test_image_count_when_fewer_than_max(self):
    max_outputs = len(self.images) - 3
    assert max_outputs > 0, max_outputs
    pb = self.compute_and_check_summary_pb('mona_lisa', self.images,
                                           max_outputs=max_outputs)
    self.assertEqual(1, len(pb.value))
    result = pb.value[0].tensor.string_val
    image_results = result[2:]  # skip width, height
    self.assertEqual(len(image_results), max_outputs)

  def test_image_count_when_more_than_max(self):
    max_outputs = len(self.images) + 3
    pb = self.compute_and_check_summary_pb('mona_lisa', self.images,
                                           max_outputs=max_outputs)
    self.assertEqual(1, len(pb.value))
    result = pb.value[0].tensor.string_val
    image_results = result[2:]  # skip width, height
    self.assertEqual(len(image_results), len(self.images))

  def _test_dimensions(self, alpha=False, static_dimensions=True):
    if not alpha:
      images = self.images
      channel_count = 3
    else:
      images = self.images_with_alpha
      channel_count = 4

    if static_dimensions:
      images_tensor = tf.constant(images, dtype=tf.uint8)
      feed_dict = {}
    else:
      images_tensor = tf.placeholder(tf.uint8)
      feed_dict = {images_tensor: images}

    pb = self.compute_and_check_summary_pb('mona_lisa', images,
                                           images_tensor=images_tensor,
                                           feed_dict=feed_dict)
    self.assertEqual(1, len(pb.value))
    result = pb.value[0].tensor.string_val

    # Check annotated dimensions.
    self.assertEqual(tf.compat.as_bytes(str(self.image_width)), result[0])
    self.assertEqual(tf.compat.as_bytes(str(self.image_height)), result[1])

    # Check actual image dimensions.
    images = result[2:]
    with tf.Session() as sess:
      placeholder = tf.placeholder(tf.string)
      decoder = tf.image.decode_png(placeholder)
      for image in images:
        decoded = sess.run(decoder, feed_dict={placeholder: image})
        self.assertEqual((self.image_height, self.image_width, channel_count),
                         decoded.shape)

  def test_dimensions(self):
    self._test_dimensions(alpha=False)

  def test_dimensions_with_alpha(self):
    self._test_dimensions(alpha=True)

  def test_dimensions_when_not_statically_known(self):
    self._test_dimensions(alpha=False, static_dimensions=False)

  def test_dimensions_with_alpha_when_not_statically_known(self):
    self._test_dimensions(alpha=True, static_dimensions=False)

  def test_requires_rank_4_in_op(self):
    with six.assertRaisesRegex(self, ValueError, 'must have rank 4'):
      summary.op('mona_lisa', tf.constant([[1, 2, 3], [4, 5, 6]]))

  def test_requires_rank_4_in_pb(self):
    with six.assertRaisesRegex(self, ValueError, 'must have rank 4'):
      summary.pb('mona_lisa', np.array([[1, 2, 3], [4, 5, 6]]))


if __name__ == '__main__':
  tf.test.main()
