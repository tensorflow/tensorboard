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
# ==============================================================================
"""Tests logic within the colormaps module."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import tensorflow as tf

from tensorboard.plugins.beholder import colormaps


class ColormapsTest(tf.test.TestCase):
  def test_convert_to_immutable_array(self):
    array = colormaps.convert_to_immutable_array(((0.21, 0.42, 0.84),
                                                  (0.1, 0.2, 0.3)))
    self.assertEqual([[53, 107, 214], [25, 51, 76]], array.tolist())
    self.assertEqual(np.uint8, array.dtype)
    self.assertFalse(array.flags.writeable)


if __name__ == '__main__':
  tf.test.main()
