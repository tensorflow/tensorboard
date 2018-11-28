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
"""Tests for the audio plugin summary generation functions."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import six
import tensorflow as tf

from tensorboard.plugins.audio import metadata
from tensorboard.plugins.audio import summary


class SummaryTest(tf.test.TestCase):

  def setUp(self):
    super(SummaryTest, self).setUp()
    tf.reset_default_graph()

    self.samples_per_second = 44100
    self.audio_count = 6
    stereo_shape = (self.audio_count, -1, 2)
    space = (np.linspace(0.0, 100.0, self.samples_per_second)
             .astype(np.float32).reshape(stereo_shape))
    self.audio_length = space.shape[1]
    self.stereo = np.sin(space)
    self.mono = self.stereo.mean(axis=2, keepdims=True)

  def pb_via_op(self, summary_op, feed_dict=None):
    with tf.Session() as sess:
      actual_pbtxt = sess.run(summary_op, feed_dict=feed_dict or {})
    actual_proto = tf.Summary()
    actual_proto.ParseFromString(actual_pbtxt)
    return actual_proto

  def compute_and_check_summary_pb(self,
                                   name,
                                   audio,
                                   max_outputs=3,
                                   display_name=None,
                                   description=None,
                                   audio_tensor=None,
                                   feed_dict=None):
    """Use both `op` and `pb` to get a summary, asserting validity.

    "Validity" means that the `op` and `pb` functions must return the
    same protobufs, and also that each encoded audio value appears to be
    a valid WAV file. If either of these conditions fails, the test will
    immediately fail. Otherwise, the valid protobuf will be returned.

    Returns:
      A `Summary` protocol buffer.
    """
    if audio_tensor is None:
      audio_tensor = tf.constant(audio)
    op = summary.op(name, audio_tensor, self.samples_per_second,
                    max_outputs=max_outputs,
                    display_name=display_name, description=description)
    pb = summary.pb(name, audio, self.samples_per_second,
                    max_outputs=max_outputs,
                    display_name=display_name, description=description)
    pb_via_op = self.pb_via_op(op, feed_dict=feed_dict)
    self.assertProtoEquals(pb, pb_via_op)
    audios = tf.make_ndarray(pb.value[0].tensor)[:, 0].tolist()
    invalid_audios = [x for x in audios
                      if not x.startswith(b'RIFF')]
    self.assertFalse(invalid_audios)
    return pb

  def test_metadata(self):
    pb = self.compute_and_check_summary_pb('k488', self.stereo)
    self.assertEqual(len(pb.value), 1)
    self.assertEqual(pb.value[0].tag, 'k488/audio_summary')
    summary_metadata = pb.value[0].metadata
    self.assertEqual(summary_metadata.display_name, 'k488')
    self.assertEqual(summary_metadata.summary_description, '')
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    content = summary_metadata.plugin_data.content
    parsed = metadata.parse_plugin_metadata(content)
    self.assertEqual(parsed.encoding, metadata.Encoding.Value('WAV'))

  def test_metadata_with_explicit_name_and_description(self):
    display_name = 'Piano Concerto No. 23 (K488)'
    description = 'In **A major.**'
    pb = self.compute_and_check_summary_pb(
        'k488', self.stereo, display_name=display_name, description=description)
    self.assertEqual(len(pb.value), 1)
    self.assertEqual(pb.value[0].tag, 'k488/audio_summary')
    summary_metadata = pb.value[0].metadata
    self.assertEqual(summary_metadata.display_name, display_name)
    self.assertEqual(summary_metadata.summary_description, description)
    plugin_data = summary_metadata.plugin_data
    self.assertEqual(plugin_data.plugin_name, metadata.PLUGIN_NAME)
    content = summary_metadata.plugin_data.content
    parsed = metadata.parse_plugin_metadata(content)
    self.assertEqual(parsed.encoding, metadata.Encoding.Value('WAV'))

  def test_correctly_handles_no_audio(self):
    shape = (0, self.audio_length, 2)
    audio = np.array([]).reshape(shape).astype(np.float32)
    pb = self.compute_and_check_summary_pb('k488', audio, max_outputs=3)
    self.assertEqual(1, len(pb.value))
    results = tf.make_ndarray(pb.value[0].tensor)
    self.assertEqual(results.shape, (0, 2))

  def test_audio_count_when_fewer_than_max(self):
    max_outputs = len(self.stereo) - 2
    assert max_outputs > 0, max_outputs
    pb = self.compute_and_check_summary_pb('k488', self.stereo,
                                           max_outputs=max_outputs)
    self.assertEqual(1, len(pb.value))
    results = tf.make_ndarray(pb.value[0].tensor)
    self.assertEqual(results.shape, (max_outputs, 2))

  def test_audio_count_when_more_than_max(self):
    max_outputs = len(self.stereo) + 2
    pb = self.compute_and_check_summary_pb('k488', self.stereo,
                                           max_outputs=max_outputs)
    self.assertEqual(1, len(pb.value))
    results = tf.make_ndarray(pb.value[0].tensor)
    self.assertEqual(results.shape, (len(self.stereo), 2))

  def test_processes_mono_audio(self):
    pb = self.compute_and_check_summary_pb('k488', self.mono)
    self.assertGreater(len(pb.value[0].tensor.string_val), 0)

  def test_requires_rank_3_in_op(self):
    with six.assertRaisesRegex(self, ValueError, 'must have rank 3'):
      summary.op('k488', tf.constant([[1, 2, 3], [4, 5, 6]]), 44100)

  def test_requires_rank_3_in_pb(self):
    with six.assertRaisesRegex(self, ValueError, 'must have rank 3'):
      summary.pb('k488', np.array([[1, 2, 3], [4, 5, 6]]), 44100)

  def test_requires_wav_in_op(self):
    with six.assertRaisesRegex(self, ValueError, 'Unknown encoding'):
      summary.op('k488', self.stereo, 44100, encoding='pptx')

  def test_requires_wav_in_pb(self):
    with six.assertRaisesRegex(self, ValueError, 'Unknown encoding'):
      summary.pb('k488', self.stereo, 44100, encoding='pptx')


if __name__ == '__main__':
  tf.test.main()
