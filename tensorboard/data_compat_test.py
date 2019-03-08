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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf

from tensorboard import data_compat
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.audio import metadata as audio_metadata
from tensorboard.plugins.audio import summary as audio_summary
from tensorboard.plugins.histogram import metadata as histogram_metadata
from tensorboard.plugins.histogram import summary as histogram_summary
from tensorboard.plugins.image import metadata as image_metadata
from tensorboard.plugins.image import summary as image_summary
from tensorboard.plugins.scalar import metadata as scalar_metadata
from tensorboard.plugins.scalar import summary as scalar_summary
from tensorboard.util import tensor_util
from tensorboard.util import test_util



class MigrateValueTest(tf.test.TestCase):
  """Tests for `migrate_value`.

  These tests should ensure that all first-party new-style values are
  passed through unchanged, that all supported old-style values are
  converted to new-style values, and that other old-style values are
  passed through unchanged.
  """

  def _value_from_op(self, op):
    with tf.compat.v1.Session() as sess:
      summary_pbtxt = sess.run(op)
    summary = summary_pb2.Summary()
    summary.ParseFromString(summary_pbtxt)
    # There may be multiple values (e.g., for an image summary that emits
    # multiple images in one batch). That's fine; we'll choose any
    # representative value, assuming that they're homogeneous.
    assert summary.value
    return summary.value[0]

  def _assert_noop(self, value):
    original_pbtxt = value.SerializeToString()
    result = data_compat.migrate_value(value)
    self.assertEqual(value, result)
    self.assertEqual(original_pbtxt, value.SerializeToString())

  def test_scalar(self):
    with tf.compat.v1.Graph().as_default():
      old_op = tf.compat.v1.summary.scalar('important_constants', tf.constant(0x5f3759df))
      old_value = self._value_from_op(old_op)
    assert old_value.HasField('simple_value'), old_value
    new_value = data_compat.migrate_value(old_value)

    self.assertEqual('important_constants', new_value.tag)
    expected_metadata = scalar_metadata.create_summary_metadata(
        display_name='important_constants',
        description='')
    self.assertEqual(expected_metadata, new_value.metadata)
    self.assertTrue(new_value.HasField('tensor'))
    data = tensor_util.make_ndarray(new_value.tensor)
    self.assertEqual((), data.shape)
    low_precision_value = np.array(0x5f3759df).astype('float32').item()
    self.assertEqual(low_precision_value, data.item())

  @test_util.run_v1_only('v1 audio summary uses contrib')
  def test_audio(self):
    audio = tf.reshape(tf.linspace(0.0, 100.0, 4 * 10 * 2), (4, 10, 2))
    old_op = tf.compat.v1.summary.audio('k488', audio, 44100)
    old_value = self._value_from_op(old_op)
    assert old_value.HasField('audio'), old_value
    new_value = data_compat.migrate_value(old_value)

    self.assertEqual('k488/audio/0', new_value.tag)
    expected_metadata = audio_metadata.create_summary_metadata(
        display_name='k488/audio/0',
        description='',
        encoding=audio_metadata.Encoding.Value('WAV'))
    self.assertEqual(expected_metadata, new_value.metadata)
    self.assertTrue(new_value.HasField('tensor'))
    data = tensor_util.make_ndarray(new_value.tensor)
    self.assertEqual((1, 2), data.shape)
    self.assertEqual(tf.compat.as_bytes(old_value.audio.encoded_audio_string),
                     data[0][0])
    self.assertEqual(b'', data[0][1])  # empty label

  def test_text(self):
    with tf.compat.v1.Graph().as_default():
      op = tf.compat.v1.summary.text('lorem_ipsum', tf.constant('dolor sit amet'))
      value = self._value_from_op(op)
    assert value.HasField('tensor'), value
    self._assert_noop(value)

  def test_fully_populated_tensor(self):
    with tf.compat.v1.Graph().as_default():
      metadata = summary_pb2.SummaryMetadata(
          plugin_data=summary_pb2.SummaryMetadata.PluginData(
              plugin_name='font_of_wisdom',
              content=b'adobe_garamond'))
      op = tf.compat.v1.summary.tensor_summary(
          name='tensorpocalypse',
          tensor=tf.constant([[0.0, 2.0], [float('inf'), float('nan')]]),
          display_name='TENSORPOCALYPSE',
          summary_description='look on my works ye mighty and despair',
          summary_metadata=metadata)
      value = self._value_from_op(op)
    assert value.HasField('tensor'), value
    self._assert_noop(value)

  def test_image(self):
    with tf.compat.v1.Graph().as_default():
      old_op = tf.compat.v1.summary.image('mona_lisa',
                                tf.image.convert_image_dtype(
                                    tf.random.normal(shape=[1, 400, 200, 3]),
                                    tf.uint8,
                                    saturate=True))
      old_value = self._value_from_op(old_op)
    assert old_value.HasField('image'), old_value
    new_value = data_compat.migrate_value(old_value)

    self.assertEqual('mona_lisa/image/0', new_value.tag)
    expected_metadata = image_metadata.create_summary_metadata(
        display_name='mona_lisa/image/0', description='')
    self.assertEqual(expected_metadata, new_value.metadata)
    self.assertTrue(new_value.HasField('tensor'))
    (width, height, data) = tensor_util.make_ndarray(new_value.tensor)
    self.assertEqual(b'200', width)
    self.assertEqual(b'400', height)
    self.assertEqual(
        tf.compat.as_bytes(old_value.image.encoded_image_string), data)

  def test_histogram(self):
    with tf.compat.v1.Graph().as_default():
      old_op = tf.compat.v1.summary.histogram('important_data',
                                    tf.random.normal(shape=[23, 45]))
      old_value = self._value_from_op(old_op)
    assert old_value.HasField('histo'), old_value
    new_value = data_compat.migrate_value(old_value)

    self.assertEqual('important_data', new_value.tag)
    expected_metadata = histogram_metadata.create_summary_metadata(
        display_name='important_data', description='')
    self.assertEqual(expected_metadata, new_value.metadata)
    self.assertTrue(new_value.HasField('tensor'))
    buckets = tensor_util.make_ndarray(new_value.tensor)
    self.assertEqual(old_value.histo.min, buckets[0][0])
    self.assertEqual(old_value.histo.max, buckets[-1][1])
    self.assertEqual(23 * 45, buckets[:, 2].astype(int).sum())

  def test_new_style_histogram(self):
    with tf.compat.v1.Graph().as_default():
      op = histogram_summary.op('important_data',
                                tf.random.normal(shape=[10, 10]),
                                bucket_count=100,
                                display_name='Important data',
                                description='secrets of the universe')
      value = self._value_from_op(op)
    assert value.HasField('tensor'), value
    self._assert_noop(value)

  def test_new_style_image(self):
    with tf.compat.v1.Graph().as_default():
      op = image_summary.op(
          'mona_lisa',
          tf.image.convert_image_dtype(
              tf.random.normal(shape=[1, 400, 200, 3]), tf.uint8, saturate=True),
          display_name='The Mona Lisa',
          description='A renowned portrait by da Vinci.')
      value = self._value_from_op(op)
    assert value.HasField('tensor'), value
    self._assert_noop(value)

  @test_util.run_v1_only('audio summary uses contrib')
  def test_new_style_audio(self):
    with tf.compat.v1.Graph().as_default():
      audio = tf.reshape(tf.linspace(0.0, 100.0, 4 * 10 * 2), (4, 10, 2))
      op = audio_summary.op('k488',
                            tf.cast(audio, tf.float32),
                            sample_rate=44100,
                            display_name='Piano Concerto No.23',
                            description='In **A major**.')
      value = self._value_from_op(op)
    assert value.HasField('tensor'), value
    self._assert_noop(value)

  def test_new_style_scalar(self):
    with tf.compat.v1.Graph().as_default():
      op = scalar_summary.op('important_constants', tf.constant(0x5f3759df),
                            display_name='Important constants',
                            description='evil floating point bit magic')
      value = self._value_from_op(op)
    assert value.HasField('tensor'), value
    self._assert_noop(value)


if __name__ == '__main__':
  tf.test.main()
