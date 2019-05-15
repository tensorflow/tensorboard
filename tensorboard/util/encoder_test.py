# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
import six
import tensorflow as tf

from tensorboard.util import encoder
from tensorboard.util import test_util


class TensorFlowPngEncoderTest(tf.test.TestCase):

  def setUp(self):
    super(TensorFlowPngEncoderTest, self).setUp()
    self._encode = encoder._TensorFlowPngEncoder()
    self._rgb = np.arange(12 * 34 * 3).reshape((12, 34, 3)).astype(np.uint8)
    self._rgba = np.arange(21 * 43 * 4).reshape((21, 43, 4)).astype(np.uint8)

  def _check_png(self, data):
    # If it has a valid PNG header and is of a reasonable size, we can
    # assume it did the right thing. We trust the underlying
    # `encode_png` op.
    self.assertEqual(b'\x89PNG', data[:4])
    self.assertGreater(len(data), 128)

  def test_invalid_non_numpy(self):
    with six.assertRaisesRegex(self, ValueError, "must be a numpy array"):
      self._encode(self._rgb.tolist())

  def test_invalid_non_uint8(self):
    with six.assertRaisesRegex(self, ValueError, "dtype must be uint8"):
      self._encode(self._rgb.astype(np.float32))

  def test_encodes_png(self):
    data = self._encode(self._rgb)
    self._check_png(data)

  def test_encodes_png_with_alpha(self):
    data = self._encode(self._rgba)
    self._check_png(data)


@test_util.run_v1_only('Uses contrib')
class TensorFlowWavEncoderTest(tf.test.TestCase):

  def setUp(self):
    super(TensorFlowWavEncoderTest, self).setUp()
    self._encode = encoder._TensorFlowWavEncoder()
    space = np.linspace(0.0, 100.0, 44100)
    self._stereo = np.array([np.sin(space), np.cos(space)]).transpose()
    self._mono = self._stereo.mean(axis=1, keepdims=True)

  def _check_wav(self, data):
    # If it has a valid WAV/RIFF header and is of a reasonable size, we
    # can assume it did the right thing. We trust the underlying
    # `encode_audio` op.
    self.assertEqual(b'RIFF', data[:4])
    self.assertGreater(len(data), 128)

  def test_encodes_mono_wav(self):
    self._check_wav(self._encode(self._mono, samples_per_second=44100))

  def test_encodes_stereo_wav(self):
    self._check_wav(self._encode(self._stereo, samples_per_second=44100))


if __name__ == '__main__':
  tf.test.main()
